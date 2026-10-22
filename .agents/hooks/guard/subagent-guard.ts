import * as fs from 'fs';
import * as path from 'path';
import { detectAgentRole, isChildSession } from './agent-access-guard';

export interface GuardDecision {
  decision: 'allow' | 'deny';
  reason?: string;
}

/**
 * サブエージェントの再利用（特に完了済Workerへのsend_message使い回し）を物理遮断するガード。
 *
 * 背景:
 * Antigravityの基底プロンプトに「リソース節約のためidleなサブエージェントにsend_messageせよ」という
 * 指示があるため、Plannerが完了済Workerを使い回し、コンテキスト250K状態で1000ステップ以上
 * 稼働して数千万〜1億トークンが浪費される事故が発生していた。
 *
 * 本ガードは、完了済みWorkerへの send_message を強制遮断（deny）し、
 * 親エージェントに manage_subagents(kill) と新規 Worker 起動を強制する。
 */
export function checkSubagentGuard(payload: any): GuardDecision | null {
  const toolCall = payload.toolCall;
  if (!toolCall || toolCall.name !== 'send_message' || !toolCall.args) {
    return null;
  }

  // 1. 子エージェント（Worker / Reviewer / Scout / Auditor / Lead Planner 等）から
  // 親エージェントへの完了・差し戻し・成果物報告は常に許可。
  // 送信元が子セッション（USER_INPUT から始まらないセッション）である場合は即時 allow とする。
  if (isChildSession(payload.transcriptPath)) {
    return { decision: 'allow' };
  }

  // 2. 送信元ロールが明示的に planner 以外である場合も許可
  const senderRole = detectAgentRole(payload.transcriptPath);
  if (senderRole !== 'planner') {
    return { decision: 'allow' };
  }

  const recipient = toolCall.args.Recipient;
  if (!recipient || typeof recipient !== 'string') {
    return { decision: 'allow' };
  }

  const recipientId = recipient.trim().replace(/^"|"$/g, '');

  // 1. 親 transcript から、この recipient がすでに TASK_COMPLETE を報告しているか確認
  if (payload.transcriptPath && fs.existsSync(payload.transcriptPath)) {
    try {
      const parentTranscript = fs.readFileSync(payload.transcriptPath, 'utf8');
      const lines = parentTranscript.trim().split('\n');

      for (let i = lines.length - 1; i >= 0; i--) {
        if (!lines[i]) continue;
        try {
          const step = JSON.parse(lines[i]);
          const content = step.content || '';
          const source = step.source || '';

          // 該当Workerからの完了報告を検知
          const isFromRecipient =
            source === recipientId || content.includes(recipientId);

          if (isFromRecipient && /TASK_COMPLETE/i.test(content)) {
            return {
              decision: 'deny',
              reason: `[GUARD] Worker reuse prohibited: Worker '${recipientId}' has already completed its phase. Reusing workers causes fatal context explosion (>250K tokens). Action: You MUST terminate this worker via manage_subagents(Action: "kill", ConversationIds: ["${recipientId}"]) and invoke a fresh Worker for the next phase.`,
            };
          }
        } catch (_e) {}
      }
    } catch (_e) {}
  }

  // 2. 子エージェントの transcript が直接参照可能な場合のチェック
  if (payload.transcriptPath) {
    try {
      // 例: .../brain/<parent-id>/.system_generated/logs/transcript.jsonl
      // ➔ .../brain/<recipientId>/.system_generated/logs/transcript.jsonl
      const brainDir = path.resolve(payload.transcriptPath, '../../../../');
      const childTranscript = path.join(
        brainDir,
        recipientId,
        '.system_generated/logs/transcript.jsonl',
      );

      if (fs.existsSync(childTranscript)) {
        const childText = fs.readFileSync(childTranscript, 'utf8');
        const childLines = childText.trim().split('\n');

        // ステップ数が多すぎる（上限35ステップ超）場合も肥大化防止でブロック
        if (childLines.length > 35) {
          return {
            decision: 'deny',
            reason: `[GUARD] Worker context limit exceeded: Worker '${recipientId}' has run for ${childLines.length} steps. To prevent memory degradation, kill this worker and invoke a new one.`,
          };
        }

        for (const line of childLines) {
          if (/TASK_COMPLETE/i.test(line)) {
            return {
              decision: 'deny',
              reason: `[GUARD] Worker reuse prohibited: Worker '${recipientId}' has completed its phase. Action: You MUST terminate this worker via manage_subagents(Action: "kill", ConversationIds: ["${recipientId}"]) and invoke a fresh Worker for the next phase.`,
            };
          }
        }
      }
    } catch (_e) {}
  }

  return { decision: 'allow' };
}
