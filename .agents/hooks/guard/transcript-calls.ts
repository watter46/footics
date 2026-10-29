import * as fs from 'fs';

export interface RecordedToolCall {
  name: string;
  args: Record<string, any>;
}

/** 引数文字列の前後の引用符・空白を除去する（transcript では `"list"` のように引用付きで記録される） */
export function cleanString(val: any): string {
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

export function parseLineNum(val: any): number | undefined {
  if (typeof val === 'number') {
    return Number.isNaN(val) ? undefined : val;
  }
  if (typeof val === 'string') {
    const n = parseInt(cleanString(val), 10);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

/**
 * 直近の USER_INPUT / SYSTEM_MESSAGE（子エージェント通知を含む）以降の
 * ツール呼び出しを時系列順に返す。パス不在・パース不能時は空配列。
 */
export function getRecentToolCalls(
  transcriptPath?: string,
): RecordedToolCall[] {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return [];

  let lines: string[];
  try {
    lines = fs.readFileSync(transcriptPath, 'utf8').trim().split('\n');
  } catch (_e) {
    return [];
  }

  const calls: RecordedToolCall[] = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i]) continue;
    let step: any;
    try {
      step = JSON.parse(lines[i]);
    } catch (_e) {
      continue;
    }
    if (step.type === 'USER_INPUT' || step.type === 'SYSTEM_MESSAGE') break;
    if (Array.isArray(step.tool_calls)) {
      for (let j = step.tool_calls.length - 1; j >= 0; j--) {
        const tc = step.tool_calls[j];
        if (tc && typeof tc.name === 'string') {
          calls.push({ name: tc.name, args: tc.args ?? {} });
        }
      }
    }
  }
  return calls.reverse();
}
