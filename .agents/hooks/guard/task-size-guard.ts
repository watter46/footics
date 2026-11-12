import * as fs from 'fs';
import * as path from 'path';
import { getTargetFilePath, isWriteTool } from './agent-access-guard';

export interface GuardDecision {
  decision: 'allow' | 'deny';
  reason?: string;
}

const MAX_TASK_PHASES = 5;
const MAX_PHASE_FILES = 6;
const MAX_TASK_LINES = 800;
const MAX_CODE_BLOCK_LINES = 120;

function isDoneTask(content: string): boolean {
  return /-\s+\*\*Status\*\*:\s*`?DONE`?\b/i.test(content);
}

/**
 * タスクファイル内のコードブロック（```〜```）の中で、指定行数（120行）を超える巨大コピペがないか検査する。
 * ※ ファイル全体のコピペを禁止し、変更箇所の局所関数・TSXブロック（前後2〜3行アンカー付き、30〜60行以内）に局所化させる。
 */
export function findOversizedCodeBlock(
  content: string,
): { lineCount: number } | null {
  const blockRegex = /```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g;
  for (const match of content.matchAll(blockRegex)) {
    const lines = match[1].split('\n').length;
    if (lines > MAX_CODE_BLOCK_LINES) {
      return { lineCount: lines };
    }
  }
  return null;
}

/**
 * タスクファイル全体の行数が上限（800行）を超えていないか検査する。
 */
export function checkTaskLineCount(
  content: string,
): { totalLines: number } | null {
  const totalLines = content.split('\n').length;
  if (totalLines > MAX_TASK_LINES) {
    return { totalLines };
  }
  return null;
}

/**
 * 各 Phase セクション内の「対象ファイル」に指定されたファイル数が上限（6個: プロダクション4+テスト2相当）
 * を超えていないか検査する。
 * ※ `[DELETE]` タグが付与された削除対象ファイルは Worker の推論負荷を増やさないため上限カウントから除外する。
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

    // [DELETE] 指定された行・項目はファイル数上限から除外する
    const targetBlock = targetMatch[1]
      .split('\n')
      .filter((line) => !/\[DELETE\]/i.test(line))
      .join('\n')
      .replace(/`?\[(?:ADD|MODIFY|DELETE)\]`?/gi, '');

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
 * 1 Phaseあたり6ファイル超の詰め込み、全体800行超過、コードブロック120行超過の全コピペ）を物理遮断するガード。
 * ※ Worker が推論なしで実装できるよう Invariants・具体式・具体テスト値を十分に記述できるよう、
 * 適正上限（800行）および単一コードブロックの全コピペ防止（120行上限）を強制する。
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

    const lineCountResult = checkTaskLineCount(code);
    if (lineCountResult) {
      return {
        decision: 'deny',
        reason: `[GUARD] Task file line limit exceeded ('${baseName}' has ${lineCountResult.totalLines} lines. Hard limit: <=${MAX_TASK_LINES} lines).\nReason: Oversized task files cause context dilution and hallucination in Worker (Flash).\nAction: Do NOT dump entire file source code. Narrow Before ➔ After down to local diff blocks (30-60 lines), or split into smaller sequential tasks (e.g. TASK-XXXa, TASK-XXXb).`,
      };
    }

    const oversizedBlock = findOversizedCodeBlock(code);
    if (oversizedBlock) {
      return {
        decision: 'deny',
        reason: `[GUARD] Oversized code block detected in '${baseName}' (${oversizedBlock.lineCount} lines > ${MAX_CODE_BLOCK_LINES} lines limit).\nReason: Full file copy-pasting is strictly prohibited. Task files must provide targeted contracts (localized Before ➔ After blocks of 30-60 lines with 2-3 anchor lines).\nAction: Narrow down the code block to only the function or TSX block being modified.`,
      };
    }

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

    // 置換文字列単体でのコードブロック超過チェック
    const oversizedInReplacement = findOversizedCodeBlock(replacement);
    if (oversizedInReplacement) {
      return {
        decision: 'deny',
        reason: `[GUARD] Oversized code block detected in '${baseName}' (${oversizedInReplacement.lineCount} lines > ${MAX_CODE_BLOCK_LINES} lines limit).\nReason: Full file copy-pasting is strictly prohibited. Task files must provide targeted contracts (localized Before ➔ After blocks of 30-60 lines with 2-3 anchor lines).\nAction: Narrow down the code block to only the function or TSX block being modified.`,
      };
    }

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

        const lineCountNext = checkTaskLineCount(nextContent);
        if (lineCountNext) {
          return {
            decision: 'deny',
            reason: `[GUARD] Task file line limit exceeded ('${baseName}' reached ${lineCountNext.totalLines} lines > ${MAX_TASK_LINES} lines).\nAction: Split into a new task file (e.g. TASK-XXXb) or narrow Before ➔ After blocks.`,
          };
        }

        const oversizedBlockNext = findOversizedCodeBlock(nextContent);
        if (oversizedBlockNext) {
          return {
            decision: 'deny',
            reason: `[GUARD] Oversized code block detected in '${baseName}' (${oversizedBlockNext.lineCount} lines > ${MAX_CODE_BLOCK_LINES} lines limit).\nAction: Narrow down the code block to only the function or TSX block being modified.`,
          };
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
