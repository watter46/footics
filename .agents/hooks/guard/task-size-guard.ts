import * as fs from 'fs';
import * as path from 'path';
import { getTargetFilePath, isWriteTool } from './agent-access-guard';

export interface GuardDecision {
  decision: 'allow' | 'deny';
  reason?: string;
}

const MAX_TASK_LINES = 250;
const MAX_TASK_PHASES = 5;

/**
 * タスクファイル（tasks/TASK-*.md）の肥大化・スコープクリープを物理遮断するガード。
 *
 * 背景:
 * TASK-002 では当初のスコープ外であるUI改善やブラウザ検証後の要望が
 * Phase 7, 8, 9 と次々に同一ファイルに継ぎ足され、34KB / 406行に肥大化。
 * 全エージェントが過去ログを毎回全読みするコンテキスト浪費を引き起こした。
 *
 * 本ガードは、行数 250行超 または 5 Phase 超のタスクファイルへの追加書き込みを強制遮断（deny）し、
 * 新規タスクチケット（例: TASK-003）への分離を物理的に強制する。
 */
export function checkTaskSizeGuard(payload: any): GuardDecision | null {
  const toolCall = payload.toolCall;
  if (!toolCall || !isWriteTool(toolCall.name) || !toolCall.args) {
    return null;
  }

  const rawTargetFile = getTargetFilePath(toolCall);
  if (!rawTargetFile) {
    return null;
  }

  const normalized = rawTargetFile.replace(/\\/g, '/');
  const baseName = path.basename(normalized);

  // tasks/TASK-*.md のみを対象とする
  if (!normalized.includes('tasks/TASK-') || !baseName.endsWith('.md')) {
    return null;
  }

  // 1. 全文書き込み (write_to_file / write_file) の場合
  if (toolCall.name === 'write_to_file' || toolCall.name === 'write_file') {
    const code = toolCall.args.CodeContent || toolCall.args.Content || '';
    const lineCount = code.split('\n').length;
    const phaseMatches = code.match(/###\s+Phase\s+\d+/gi) || [];

    if (lineCount > MAX_TASK_LINES || phaseMatches.length > MAX_TASK_PHASES) {
      return {
        decision: 'deny',
        reason: `[GUARD] Task file limit exceeded ('${baseName}' has ${lineCount} lines / ${phaseMatches.length} phases. Limits: <=${MAX_TASK_LINES} lines, <=${MAX_TASK_PHASES} phases).\nReason: Oversized task files cause severe context bloat and token waste across all agents.\nAction: Do NOT append additional phases to this task. Mark this task as DONE, commit the changes, and create a new task file (e.g. TASK-003) for additional requirements.`,
      };
    }
    return { decision: 'allow' };
  }

  // 2. 部分置換 (replace_file_content / edit_file) の場合
  if (
    toolCall.name === 'replace_file_content' ||
    toolCall.name === 'edit_file'
  ) {
    const replacement =
      toolCall.args.ReplacementContent || toolCall.args.Replacement || '';

    // 新たに Phase 6 以降を追加しようとしているか直接チェック
    if (/###\s+Phase\s+([6-9]|\d{2,})/i.test(replacement)) {
      return {
        decision: 'deny',
        reason: `[GUARD] Task file limit exceeded: Adding Phase 6+ to '${baseName}' is prohibited (Max allowed: ${MAX_TASK_PHASES} phases).\nAction: Do NOT append additional phases to this task. Mark this task as DONE, commit the changes, and create a new task file (e.g. TASK-003) for additional requirements.`,
      };
    }

    // ファイルが存在する場合、置換後の行数とPhase数を推定
    const resolvedPath = path.resolve(rawTargetFile);
    if (fs.existsSync(resolvedPath)) {
      try {
        const currentContent = fs.readFileSync(resolvedPath, 'utf8');
        const targetContent =
          toolCall.args.TargetContent || toolCall.args.Target || '';

        let nextContent = currentContent;
        if (targetContent && currentContent.includes(targetContent)) {
          nextContent = currentContent.replace(targetContent, replacement);
        }

        const nextLines = nextContent.split('\n').length;
        const nextPhases = (nextContent.match(/###\s+Phase\s+\d+/gi) || [])
          .length;

        // 既存の肥大化ファイル（TASK-001, TASK-002）の完了チェックボックス更新等は許容しつつ、
        // さらに行数が 250 を超えて増殖する追加編集を防止
        if (
          nextPhases > MAX_TASK_PHASES &&
          replacement.includes('### Phase ')
        ) {
          return {
            decision: 'deny',
            reason: `[GUARD] Task file limit exceeded ('${baseName}' has ${nextPhases} phases > ${MAX_TASK_PHASES}).\nAction: Create a new task file (e.g. TASK-003) for additional requirements.`,
          };
        }

        if (
          nextLines > MAX_TASK_LINES &&
          nextLines > currentContent.split('\n').length + 10
        ) {
          return {
            decision: 'deny',
            reason: `[GUARD] Task file limit exceeded ('${baseName}' would expand to ${nextLines} lines > ${MAX_TASK_LINES} lines).\nAction: Keep task files concise or split into a new task file.`,
          };
        }
      } catch (_e) {}
    }

    return { decision: 'allow' };
  }

  return { decision: 'allow' };
}
