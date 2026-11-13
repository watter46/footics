import * as fs from 'fs';
import * as path from 'path';
import { getTargetFilePath, isWriteTool } from './agent-access-guard';

export interface GuardDecision {
  decision: 'allow' | 'deny';
  reason?: string;
}

const MAX_TASK_PHASES = 5;
const MAX_PHASE_FILES = 4;
const MAX_TASK_LINES = 400;
const MAX_CODE_BLOCK_LINES = 40;

function isDoneTask(content: string): boolean {
  return /-\s+\*\*Status\*\*:\s*`?DONE`?\b/i.test(content);
}

/**
 * タスクファイル内のコードブロック（```〜```）の中で、40行を超えるブロックがないか検査する。
 * 実装本体や Before/After 全文写経を物理遮断し、型・シグネチャ・数式のみに限定させる。
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
 * タスクファイル全体の行数が上限（400行）を超えていないか検査する。
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
 * 各 Phase セクション内の Target Files に指定された実作業ファイル数が上限（4個）
 * を超えていないか検査する（※ `[DELETE]` タグ行は上限カウントから除外）。
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
      /-\s+\*\*(?:対象ファイル|Target Files)\*\*:\s*([^\n]*(?:\n\s+-\s+[^\n]*)*)/i,
    );
    if (!targetMatch) continue;

    const lines = targetMatch[1]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !/`?\[DELETE\]`?/i.test(l));

    let fileCount = 0;
    for (const line of lines) {
      const backticks = line.match(/`[^`\n]+`/g);
      if (backticks && backticks.length > 0) {
        const files = backticks
          .map((b) => b.slice(1, -1).trim())
          .filter((t) => !/^\[(?:ADD|MODIFY|DELETE)\]$/i.test(t));
        fileCount += files.length;
      } else {
        const stripped = line
          .replace(/^-\s*/, '')
          .replace(/\[(?:ADD|MODIFY|DELETE)\]/gi, '')
          .trim();
        if (stripped) {
          fileCount += stripped.split(',').filter((s) => s.trim()).length;
        }
      }
    }

    if (fileCount > MAX_PHASE_FILES) {
      return { phaseHeader, fileCount };
    }
  }
  return null;
}

/**
 * タスクファイル（tasks/TASK-*.md）の過積載（6 Phase以上、DONE後追記、1 Phase 4ファイル超、
 * 全体400行超、コードブロック40行超の実装写経）を物理遮断するガード。
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
        reason: `[GUARD] Task file line limit exceeded ('${baseName}' has ${lineCountResult.totalLines} lines. Hard limit: <=${MAX_TASK_LINES} lines).\nReason: Oversized specs degrade Hydrogen/low execution quality.\nAction: Remove implementation code / Before-After dumps and split into sequential tasks (e.g. TASK-XXXa, TASK-XXXb).`,
      };
    }

    const oversizedBlock = findOversizedCodeBlock(code);
    if (oversizedBlock) {
      return {
        decision: 'deny',
        reason: `[GUARD] Oversized code block detected in '${baseName}' (${oversizedBlock.lineCount} lines > ${MAX_CODE_BLOCK_LINES} lines limit).\nReason: Implementation bodies and Before/After copy-pasting are prohibited. Only public interfaces, signatures, and formulas (<= ${MAX_CODE_BLOCK_LINES} lines) are allowed.\nAction: Replace implementation blocks with Design Contracts and leave coding to the Worker.`,
      };
    }

    if (existingContent && isDoneTask(existingContent)) {
      const prevPhases = (existingContent.match(/###\s+Phase\s+\d+/gi) || [])
        .length;
      if (phaseMatches.length > prevPhases) {
        return {
          decision: 'deny',
          reason: `[GUARD] Task file modification blocked: '${baseName}' is already marked as DONE. Appending new phases to a completed task is prohibited.\nAction: Create a new task file (e.g. TASK-XXX) for additional requirements.`,
        };
      }
    }

    if (phaseMatches.length > MAX_TASK_PHASES) {
      return {
        decision: 'deny',
        reason: `[GUARD] Task file limit exceeded ('${baseName}' has ${phaseMatches.length} phases. Limit: <=${MAX_TASK_PHASES} phases).\nAction: Split into sequential task files (e.g. TASK-XXXa, TASK-XXXb).`,
      };
    }

    const overstuffed = findOverstuffedPhase(code);
    if (overstuffed) {
      return {
        decision: 'deny',
        reason: `[GUARD] Phase file limit exceeded in '${baseName}' (${overstuffed.phaseHeader} has ${overstuffed.fileCount} target files. Limit: <=${MAX_PHASE_FILES} active files, [DELETE] excluded).\nReason: Exceeding 4 files degrades Hydrogen/low Worker quality.\nAction: Split the phase into smaller phases of <=${MAX_PHASE_FILES} active files each.`,
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

    const oversizedInReplacement = findOversizedCodeBlock(replacement);
    if (oversizedInReplacement) {
      return {
        decision: 'deny',
        reason: `[GUARD] Oversized code block detected in '${baseName}' (${oversizedInReplacement.lineCount} lines > ${MAX_CODE_BLOCK_LINES} lines limit).\nReason: Implementation bodies and Before/After copy-pasting are prohibited.\nAction: Keep code blocks to public signatures/interfaces (<= ${MAX_CODE_BLOCK_LINES} lines).`,
      };
    }

    if (/###\s+Phase\s+([6-9]|\d{2,})/i.test(replacement)) {
      return {
        decision: 'deny',
        reason: `[GUARD] Task file limit exceeded: Adding Phase 6+ to '${baseName}' is prohibited (Max allowed: ${MAX_TASK_PHASES} phases).\nAction: Create a new sequential task file instead.`,
      };
    }

    const prevPhaseCountInTarget = (
      targetContent.match(/###\s+Phase\s+\d+/gi) || []
    ).length;
    const nextPhaseCountInReplacement = (
      replacement.match(/###\s+Phase\s+\d+/gi) || []
    ).length;
    const isAddingPhase = nextPhaseCountInReplacement > prevPhaseCountInTarget;

    if (isDoneTask(targetContent) && isAddingPhase) {
      return {
        decision: 'deny',
        reason: `[GUARD] Task file modification blocked: '${baseName}' is already marked as DONE. Appending new phases is prohibited.`,
      };
    }

    const overstuffedInReplacement = findOverstuffedPhase(replacement);
    if (overstuffedInReplacement) {
      return {
        decision: 'deny',
        reason: `[GUARD] Phase file limit exceeded in '${baseName}' (${overstuffedInReplacement.phaseHeader} has ${overstuffedInReplacement.fileCount} target files. Limit: <=${MAX_PHASE_FILES} active files, [DELETE] excluded).\nAction: Split into smaller phases.`,
      };
    }

    if (existingContent !== null) {
      try {
        if (isDoneTask(existingContent) && isAddingPhase) {
          return {
            decision: 'deny',
            reason: `[GUARD] Task file modification blocked: '${baseName}' is already marked as DONE. Appending new phases is prohibited.`,
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
            reason: `[GUARD] Task file line limit exceeded ('${baseName}' reached ${lineCountNext.totalLines} lines > ${MAX_TASK_LINES} lines).\nAction: Split into a new sequential task file or tighten contracts.`,
          };
        }

        const oversizedBlockNext = findOversizedCodeBlock(nextContent);
        if (oversizedBlockNext) {
          return {
            decision: 'deny',
            reason: `[GUARD] Oversized code block detected in '${baseName}' (${oversizedBlockNext.lineCount} lines > ${MAX_CODE_BLOCK_LINES} lines limit).`,
          };
        }

        const nextPhases = (nextContent.match(/###\s+Phase\s+\d+/gi) || [])
          .length;

        if (nextPhases > MAX_TASK_PHASES && isAddingPhase) {
          return {
            decision: 'deny',
            reason: `[GUARD] Task file limit exceeded ('${baseName}' has ${nextPhases} phases > ${MAX_TASK_PHASES}).`,
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
            reason: `[GUARD] Phase file limit exceeded in '${baseName}' (${overstuffedNext.phaseHeader} has ${overstuffedNext.fileCount} target files. Limit: <=${MAX_PHASE_FILES} active files, [DELETE] excluded).`,
          };
        }
      } catch (_e) {}
    }

    return { decision: 'allow' };
  }

  return { decision: 'allow' };
}
