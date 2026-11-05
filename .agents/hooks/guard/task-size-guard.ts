import * as fs from 'fs';
import * as path from 'path';
import { getTargetFilePath, isWriteTool } from './agent-access-guard';

export interface GuardDecision {
  decision: 'allow' | 'deny';
  reason?: string;
}

const MAX_TASK_PHASES = 5;
const MAX_PHASE_FILES = 6;

function isDoneTask(content: string): boolean {
  return /-\s+\*\*Status\*\*:\s*`?DONE`?\b/i.test(content);
}

/**
 * 各 Phase セクション内の「対象ファイル」に指定されたファイル数が上限（6個: プロダクション4+テスト2相当）
 * を超えていないか検査する。
 */
export function findOverstuffedPhase(
  content: string,
): { phaseHeader: string; fileCount: number } | null {
  const phaseRegex =
    /^(###\s+Phase\s+\d+[^\n]*)\n([\s\S]*?)(?=^###\s+Phase\s+\d+|^##\s+\d+\.|$(?![\s\S]))/gm;

  for (const match of content.matchAll(phaseRegex)) {
    const phaseHeader = match[1].trim();
    const body = match[2];

    const targetMatch = body.match(
      /-\s+\*\*(?:対象ファイル|Target Files|対象スコープ)\*\*:\s*([^\n]*(?:\n\s+-\s+[^\n]*)*)/i,
    );
    if (!targetMatch) continue;

    const targetBlock = targetMatch[1];
    const backtickFiles = targetBlock.match(/`[^`\n]+`/g);
    let fileCount = 0;
    if (backtickFiles && backtickFiles.length > 0) {
      fileCount = backtickFiles.length;
    } else {
      fileCount = targetBlock
        .split(/[,\n]/)
        .map((s) => s.replace(/^\s*-\s*/, '').trim())
        .filter(Boolean).length;
    }

    if (fileCount > MAX_PHASE_FILES) {
      return { phaseHeader, fileCount };
    }
  }
  return null;
}

/**
 * タスクファイル（tasks/TASK-*.md）のスコープクリープ（6 Phase以上の継ぎ足し、DONEタスクへのPhase追記、
 * 1 Phaseあたり6ファイル超の詰め込み）を物理遮断するガード。
 * ※ Worker が推論なしで実装できるよう Invariants・具体式・具体テスト値を十分に記述するため、行数制限（旧250行）は設けない。
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

  const resolvedPath = path.resolve(rawTargetFile);
  const existingContent = fs.existsSync(resolvedPath)
    ? fs.readFileSync(resolvedPath, 'utf8')
    : null;

  // 1. 全文書き込み (write_to_file / write_file) の場合
  if (toolCall.name === 'write_to_file' || toolCall.name === 'write_file') {
    const code = toolCall.args.CodeContent || toolCall.args.Content || '';
    const phaseMatches = code.match(/###\s+Phase\s+\d+/gi) || [];

    if (existingContent && isDoneTask(existingContent)) {
      const prevPhases = (existingContent.match(/###\s+Phase\s+\d+/gi) || [])
        .length;
      if (phaseMatches.length > prevPhases) {
        return {
          decision: 'deny',
          reason: `[GUARD] Task file modification blocked: '${baseName}' is already marked as DONE. Appending new phases to a completed task is prohibited.\nAction: Create a new task file (e.g. TASK-003) for additional requirements.`,
        };
      }
    }

    if (phaseMatches.length > MAX_TASK_PHASES) {
      return {
        decision: 'deny',
        reason: `[GUARD] Task file limit exceeded ('${baseName}' has ${phaseMatches.length} phases. Limit: <=${MAX_TASK_PHASES} phases).\nReason: Oversized task scopes cause context bloat across agents.\nAction: Do NOT append additional phases to this task. Split into a new task file (e.g. TASK-003).`,
      };
    }

    const overstuffed = findOverstuffedPhase(code);
    if (overstuffed) {
      return {
        decision: 'deny',
        reason: `[GUARD] Phase file limit exceeded in '${baseName}' (${overstuffed.phaseHeader} has ${overstuffed.fileCount} target files. Limit: <=${MAX_PHASE_FILES} files [max 4 production + 2 test]).\nAction: Split the phase into smaller phases of <=4 production files each.`,
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
    const targetContent =
      toolCall.args.TargetContent || toolCall.args.Target || '';

    // 新たに Phase 6 以降を追加しようとしているか直接チェック
    if (/###\s+Phase\s+([6-9]|\d{2,})/i.test(replacement)) {
      return {
        decision: 'deny',
        reason: `[GUARD] Task file limit exceeded: Adding Phase 6+ to '${baseName}' is prohibited (Max allowed: ${MAX_TASK_PHASES} phases).\nAction: Do NOT append additional phases to this task. Mark this task as DONE, commit the changes, and create a new task file (e.g. TASK-003) for additional requirements.`,
      };
    }

    const prevPhaseCountInTarget = (
      targetContent.match(/###\s+Phase\s+\d+/gi) || []
    ).length;
    const nextPhaseCountInReplacement = (
      replacement.match(/###\s+Phase\s+\d+/gi) || []
    ).length;
    const isAddingPhase = nextPhaseCountInReplacement > prevPhaseCountInTarget;

    // TargetContent 自体に Status: DONE が含まれており、新規 Phase を追記しようとしている場合
    if (isDoneTask(targetContent) && isAddingPhase) {
      return {
        decision: 'deny',
        reason: `[GUARD] Task file modification blocked: '${baseName}' is already marked as DONE. Appending new phases to a completed task is prohibited.\nAction: Create a new task file (e.g. TASK-003) for additional requirements.`,
      };
    }

    // 置換文字列単体での 1 Phase ファイル数超過チェック
    const overstuffedInReplacement = findOverstuffedPhase(replacement);
    if (overstuffedInReplacement) {
      return {
        decision: 'deny',
        reason: `[GUARD] Phase file limit exceeded in '${baseName}' (${overstuffedInReplacement.phaseHeader} has ${overstuffedInReplacement.fileCount} target files. Limit: <=${MAX_PHASE_FILES} files [max 4 production + 2 test]).\nAction: Split the phase into smaller phases of <=4 production files each.`,
      };
    }

    // ファイルが存在する場合、置換後の全体構造を検査
    if (existingContent !== null) {
      try {
        if (isDoneTask(existingContent) && isAddingPhase) {
          return {
            decision: 'deny',
            reason: `[GUARD] Task file modification blocked: '${baseName}' is already marked as DONE. Appending new phases to a completed task is prohibited.\nAction: Create a new task file (e.g. TASK-003) for additional requirements.`,
          };
        }

        let nextContent = existingContent;
        if (targetContent && existingContent.includes(targetContent)) {
          nextContent = existingContent.replace(targetContent, replacement);
        }

        const nextPhases = (nextContent.match(/###\s+Phase\s+\d+/gi) || [])
          .length;

        if (nextPhases > MAX_TASK_PHASES && isAddingPhase) {
          return {
            decision: 'deny',
            reason: `[GUARD] Task file limit exceeded ('${baseName}' has ${nextPhases} phases > ${MAX_TASK_PHASES}).\nAction: Create a new task file (e.g. TASK-003) for additional requirements.`,
          };
        }

        const overstuffedNext = findOverstuffedPhase(nextContent);
        if (
          overstuffedNext &&
          (replacement.includes('対象ファイル') ||
            replacement.includes('Target Files') ||
            replacement.includes('### Phase'))
        ) {
          return {
            decision: 'deny',
            reason: `[GUARD] Phase file limit exceeded in '${baseName}' (${overstuffedNext.phaseHeader} has ${overstuffedNext.fileCount} target files. Limit: <=${MAX_PHASE_FILES} files [max 4 production + 2 test]).\nAction: Split the phase into smaller phases of <=4 production files each.`,
          };
        }
      } catch (_e) {}
    }

    return { decision: 'allow' };
  }

  return { decision: 'allow' };
}
