import * as fs from 'fs';
import * as path from 'path';
import { detectAgentRole } from './agent-access-guard';
import type { GuardDecision } from './safety-filter';

const SMALL_FILE_LINE_LIMIT = 400;

function cleanString(val: any): string {
  if (typeof val !== 'string') return '';
  let s = val.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function parseLineNum(val: any): number | undefined {
  if (typeof val === 'number') {
    return isNaN(val) ? undefined : val;
  }
  if (typeof val === 'string') {
    const cleaned = cleanString(val);
    const n = parseInt(cleaned, 10);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
}

/**
 * 過去の transcript から、同一ファイルに対してスライス読込がすでに行われていたかを判定する
 */
function hasRecentSliceRead(
  transcriptPath: string | undefined,
  targetFile: string,
): boolean {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;

  try {
    const transcript = fs.readFileSync(transcriptPath, 'utf8');
    const lines = transcript.trim().split('\n');
    const startIndex = Math.max(0, lines.length - 30);

    for (let i = lines.length - 1; i >= startIndex; i--) {
      if (!lines[i]) continue;
      try {
        const step = JSON.parse(lines[i]);
        if (step.tool_calls) {
          for (const tc of step.tool_calls) {
            if (tc.name === 'view_file' && tc.args) {
              const tcPath = cleanString(tc.args.AbsolutePath || '');
              if (tcPath && path.resolve(tcPath) === targetFile) {
                const start = parseLineNum(tc.args.StartLine);
                const end = parseLineNum(tc.args.EndLine);
                if (start !== undefined || end !== undefined) {
                  return true;
                }
              }
            }
          }
        }
      } catch (_e) {}
    }
  } catch (_e) {}

  return false;
}

/**
 * Reviewer セッションにおいて、直列に view_file が連続実行されているかを判定する
 */
function hasSequentialSingleViewLoop(
  transcriptPath: string | undefined,
): boolean {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;

  try {
    const transcript = fs.readFileSync(transcriptPath, 'utf8');
    const lines = transcript.trim().split('\n');
    let consecutiveViews = 0;
    const startIndex = Math.max(0, lines.length - 15);

    for (let i = lines.length - 1; i >= startIndex; i--) {
      if (!lines[i]) continue;
      try {
        const step = JSON.parse(lines[i]);
        if (step.tool_calls) {
          const hasView = step.tool_calls.some(
            (tc: any) => tc.name === 'view_file',
          );
          if (hasView) {
            consecutiveViews++;
          } else if (step.type === 'PLANNER_RESPONSE') {
            break;
          }
        }
      } catch (_e) {}
    }
    return consecutiveViews >= 3;
  } catch (_e) {}

  return false;
}

function checkViewGuard(payload: any): GuardDecision | null {
  const toolCall = payload.toolCall;
  if (!toolCall || toolCall.name !== 'view_file' || !toolCall.args) {
    return null;
  }

  const rawPath = cleanString(toolCall.args.AbsolutePath || '');
  if (!rawPath) return null;

  const resolvedPath = path.resolve(rawPath);
  const baseName = path.basename(resolvedPath);

  // 1. ログファイル・tee出力のチェック (既存ルール)
  if (/\.log$/i.test(resolvedPath) || resolvedPath.includes('/rtk/tee/')) {
    const start = parseLineNum(toolCall.args.StartLine);
    const end = parseLineNum(toolCall.args.EndLine);
    const hasSlice = start !== undefined || end !== undefined;
    const range = start !== undefined && end !== undefined ? end - start : 999;

    if (!hasSlice || range > 100) {
      return {
        decision: 'deny',
        reason: `[GUARD] Reading entire log files with 'view_file' causes token explosion (${rawPath}). Use 'rtk log <file>' or specify StartLine/EndLine with a range under 100 lines.`,
      };
    }
    return { decision: 'allow' };
  }

  // 2. 存在しないファイルへの推測アクセス遮断 (Ghost Path Guard)
  if (!fs.existsSync(resolvedPath)) {
    return {
      decision: 'deny',
      reason: `[GUARD] File not found: '${rawPath}'. Guessing file paths without verifying is strictly prohibited.\nAction: Locate the target file using 'rtk grep <keyword> .agents/.cache/repo_map.txt' or 'rtk find . -name "<glob>"' first.`,
    };
  }

  // 3. 小型ファイル判定 & 総行数取得
  let fileLines: string[] = [];
  try {
    const content = fs.readFileSync(resolvedPath, 'utf8');
    fileLines = content.split('\n');
  } catch (_e) {
    return { decision: 'allow' };
  }

  const totalLines = fileLines.length;
  const startLine = parseLineNum(toolCall.args.StartLine);
  const endLine = parseLineNum(toolCall.args.EndLine);
  const hasSlice = startLine !== undefined || endLine !== undefined;

  // 3a. 小型ファイル (400行以下) のスライス読込遮断
  // view_file は最大 800 行まで一括取得可能。400行以下の小型ファイルを小刻みに読むのはターン・トークンの浪費。
  if (totalLines <= SMALL_FILE_LINE_LIMIT && hasSlice) {
    const isWholeFile =
      (startLine === undefined || startLine <= 1) &&
      (endLine === undefined || endLine >= totalLines);

    if (!isWholeFile) {
      return {
        decision: 'deny',
        reason: `[GUARD] Slicing small files is prohibited ('${baseName}' has ${totalLines} lines <= ${SMALL_FILE_LINE_LIMIT} lines).\nReason: Paging small files causes severe token waste, context fragmentation, and lost imports.\nAction: Call 'view_file' with ONLY 'AbsolutePath' (omit 'StartLine' and 'EndLine') to retrieve the entire file in 1 turn (view_file supports up to 800 lines).`,
      };
    }
  }

  // 4. 同一ファイルに対する小刻みな連続スライス読込の検知 (Paging Loop Guard)
  // 400行超のファイルであっても、同一ファイルに対して複数回連続してスライス読込を試みるのは禁止。
  if (hasSlice) {
    const isRepeat = hasRecentSliceRead(payload.transcriptPath, resolvedPath);
    if (isRepeat) {
      return {
        decision: 'deny',
        reason: `[GUARD] Sequential slicing loop detected for '${baseName}'.\nReason: Reading the same file in small chunks across multiple turns is prohibited.\nAction: If you need to view the implementation, call 'view_file' without StartLine/EndLine (up to 800 lines), or pinpoint exact lines using 'rtk grep <pattern> <file>' / 'ast-grep' first.`,
      };
    }
  }

  // 5. Reviewer による直列全ファイル読込ループの検知 (Reviewer View Loop Guard)
  const role = detectAgentRole(payload.transcriptPath);
  if (role === 'reviewer') {
    const isSequentialLoop = hasSequentialSingleViewLoop(
      payload.transcriptPath,
    );
    if (isSequentialLoop) {
      return {
        decision: 'deny',
        reason: `[GUARD] Sequential full-file reading loop detected in Reviewer session (3+ consecutive view_file calls).\nReason: Reading entire files sequentially causes extreme token explosion (>3M tokens).\nAction: Inspect diffs via 'bun run ai:reviewer:check' or 'rtk diff', or pass multiple files in parallel in a single turn.`,
      };
    }
  }

  return { decision: 'allow' };
}

export { checkViewGuard, SMALL_FILE_LINE_LIMIT };
