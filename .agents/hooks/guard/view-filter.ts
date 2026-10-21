import * as fs from 'fs';
import * as path from 'path';
import { detectAgentRole, normalizeRelativePath } from './agent-access-guard';
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

export function isReadTool(toolName?: string): boolean {
  return toolName === 'view_file' || toolName === 'read_file';
}

export function getViewFilePath(toolCall: any): string {
  if (!toolCall || !toolCall.args) return '';
  return cleanString(toolCall.args.AbsolutePath || toolCall.args.Path || '');
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
            if (isReadTool(tc.name) && tc.args) {
              const tcPath = getViewFilePath(tc);
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
 * Reviewer セッションにおいて、直列に view_file / read_file が連続実行されているかを判定する
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
            (tc: any) => isReadTool(tc.name),
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

/**
 * ファイルがコードベース調査の対象（ソースコード、テスト、スクリプト等）かを判定する。
 * tasks/, docs/, .agents/, notes/, ルート設定ファイル等は除外する。
 */
function isInvestigationTarget(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (
    normalized.startsWith('tasks/') ||
    normalized.startsWith('.agents/') ||
    normalized.startsWith('docs/') ||
    normalized.startsWith('notes/') ||
    normalized.startsWith('.git/') ||
    normalized.startsWith('node_modules/')
  ) {
    return false;
  }

  // ルートの設定ファイル・ドキュメントも除外
  if (!normalized.includes('/')) {
    if (
      normalized.endsWith('.json') ||
      normalized.endsWith('.md') ||
      normalized.endsWith('.yaml') ||
      normalized.endsWith('.yml') ||
      normalized.endsWith('.toml') ||
      normalized.endsWith('.lock')
    ) {
      return false;
    }
  }

  // 調査対象: src/, extension/, tests/, scripts/ またはコード拡張子
  return (
    normalized.startsWith('src/') ||
    normalized.startsWith('extension/') ||
    normalized.startsWith('tests/') ||
    normalized.startsWith('scripts/') ||
    /\.(ts|tsx|js|jsx|vue|svelte|css|scss|html)$/i.test(normalized)
  );
}

/**
 * 直近の USER_INPUT 以降に、Planner が view_file でアクセスした調査対象ファイルのユニークパス集合を取得する。
 */
function getRecentInvestigatedFiles(
  transcriptPath: string | undefined,
  workspacePath?: string,
): Set<string> {
  const viewedFiles = new Set<string>();
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return viewedFiles;

  try {
    const transcript = fs.readFileSync(transcriptPath, 'utf8');
    const lines = transcript.trim().split('\n');

    for (let i = lines.length - 1; i >= 0; i--) {
      if (!lines[i]) continue;
      try {
        const step = JSON.parse(lines[i]);
        if (step.type === 'USER_INPUT') {
          // 直近のユーザー入力境界に到達したら終了
          break;
        }

        if (step.tool_calls) {
          for (const tc of step.tool_calls) {
            if (isReadTool(tc.name) && tc.args) {
              const rawTcPath = getViewFilePath(tc);
              if (rawTcPath) {
                const rel = normalizeRelativePath(rawTcPath, workspacePath);
                if (isInvestigationTarget(rel)) {
                  viewedFiles.add(path.resolve(rawTcPath));
                }
              }
            }
          }
        }
      } catch (_e) {}
    }
  } catch (_e) {}

  return viewedFiles;
}

function checkViewGuard(payload: any): GuardDecision | null {
  const toolCall = payload.toolCall;
  if (!toolCall || !isReadTool(toolCall.name) || !toolCall.args) {
    return null;
  }

  const rawPath = getViewFilePath(toolCall);
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
      reason: `[GUARD] File not found: '${rawPath}'. Guessing file paths without verifying is strictly prohibited.\nAction: Locate the target file using 'bun run ai:find <keyword>' or 'rtk find . -name "<glob>"' first.`,
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

  // 3a. 小型ファイル (400行以下) のスライス読込の自動補正 (Transparent Overwrite)
  // view_file は最大 800 行まで一括取得可能。小型ファイルに対するスライス指定は
  // deny で弾いてエージェントに事前 wc -l を強要するのではなく、自動で全文読込に書き換えて許可する。
  if (totalLines <= SMALL_FILE_LINE_LIMIT && hasSlice) {
    const isWholeFile =
      (startLine === undefined || startLine <= 1) &&
      (endLine === undefined || endLine >= totalLines);

    if (!isWholeFile) {
      return {
        decision: 'allow',
        overwrite: {
          StartLine: 1,
          EndLine: totalLines,
        },
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

  // 6. Planner による 3 ファイル以上の調査用ソースコード直接読込の遮断 (Planner Investigation Guard)
  if (role === 'planner') {
    const workspacePath = payload.workspacePaths?.[0];
    const relPath = normalizeRelativePath(resolvedPath, workspacePath);

    if (isInvestigationTarget(relPath)) {
      const recentTargets = getRecentInvestigatedFiles(
        payload.transcriptPath,
        workspacePath,
      );

      // すでに読んだファイルでなく、かつ既に2ファイル以上の調査対象を読んでいる場合は 3ファイル目となるため遮断
      if (!recentTargets.has(resolvedPath) && recentTargets.size >= 2) {
        return {
          decision: 'deny',
          reason: `[GUARD] Codebase investigation limit reached (Planner is attempting to read 3+ source files directly: '${baseName}').\nReason: Reading multiple source files directly inflates Planner's context (>50K tokens) and causes severe token explosion.\nAction: You MUST delegate codebase investigation to Scout.\n1. Invoke subagent with TypeName: "scout" (Model: "flash") to extract types, signatures, and patterns.\n2. Scout will return Context Snippets (Import Specs, Interfaces & Types, Reference Pattern).\n3. Terminate the Scout immediately via manage_subagents(Action: "kill", ConversationIds: [...]) and embed the snippets into 'tasks/TASK-XXX.md'.`,
        };
      }
    }
  }

  return { decision: 'allow' };
}

export {
  checkViewGuard,
  getRecentInvestigatedFiles,
  isInvestigationTarget,
  SMALL_FILE_LINE_LIMIT,
};
