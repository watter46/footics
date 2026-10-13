import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface StepResult {
  name: string;
  ok: boolean;
  skipped: boolean;
  /** 1行要約 (例: "24✓", "0e/12w", "skip(no ts)") */
  summary: string;
  /** 失敗時のみ: 先頭エラー行 (file:line 付き) */
  head: string[];
  /** 全文ログのパス (skip 時は空文字) */
  logPath: string;
}

export interface RunStepOptions {
  cwd?: string;
  logDir?: string;
  maxHead?: number;
  /** 出力全文から成功時の要約を作る。省略時は 'ok' */
  summarize?: (output: string) => string;
  /** 出力全文から失敗時の先頭行を作る。省略時は汎用抽出 */
  extractHead?: (output: string, max: number) => string[];
}

const ESC = String.fromCharCode(27);
const ANSI_RE = new RegExp(`${ESC}\\[[0-9;]*m`, 'g');
const ERROR_LINE_RE =
  /(\berror\b|\bfail(ed|ure)?\b|✗|×|✘|TS\d{4}|^\s*\S+:\d+(:\d+)?\b)/i;
const MAX_LINE_LENGTH = 200;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '');
}

function clip(line: string): string {
  const trimmed = line.trim();
  return trimmed.length > MAX_LINE_LENGTH
    ? `${trimmed.slice(0, MAX_LINE_LENGTH)}…`
    : trimmed;
}

/** 汎用: エラーらしい行を重複排除して先頭 max 行。無ければ末尾 max 行。 */
export function defaultExtractHead(output: string, max: number): string[] {
  const lines = stripAnsi(output)
    .split('\n')
    .map(clip)
    .filter((l) => l.length > 0);
  const hits = [...new Set(lines.filter((l) => ERROR_LINE_RE.test(l)))];
  return (hits.length > 0 ? hits : lines.slice(-max)).slice(0, max);
}

export function skippedStep(name: string, reason: string): StepResult {
  return {
    name,
    ok: true,
    skipped: true,
    summary: `skip(${reason})`,
    head: [],
    logPath: '',
  };
}

function writeLog(name: string, output: string, logDir: string): string {
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, `${name}-${Date.now()}.log`);
  fs.writeFileSync(logPath, output);
  return logPath;
}

/**
 * コマンドを実行し、出力全文をログファイルへ退避、標準出力用には要約のみ返す。
 * シェルを介さない (argv 直渡し) ため、クォート崩れ・パイプ分割によるフック誤判定を受けない。
 */
export function runStep(
  name: string,
  cmd: string[],
  opts: RunStepOptions = {},
): StepResult {
  const cwd = opts.cwd ?? process.cwd();
  const logDir = opts.logDir ?? path.join(cwd, '.agents/logs');
  const maxHead = opts.maxHead ?? 20;
  const proc = spawnSync(cmd[0], cmd.slice(1), {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = stripAnsi(
    `${proc.stdout ?? ''}${proc.stderr ?? ''}${proc.error ? String(proc.error) : ''}`,
  );
  const logPath = writeLog(name, output, logDir);
  const ok = proc.status === 0 && !proc.error;
  if (ok) {
    return {
      name,
      ok,
      skipped: false,
      summary: opts.summarize ? opts.summarize(output) : 'ok',
      head: [],
      logPath,
    };
  }
  const extract = opts.extractHead ?? defaultExtractHead;
  return {
    name,
    ok,
    skipped: false,
    summary: `fail(exit ${proc.status ?? 'spawn'})`,
    head: extract(output, maxHead),
    logPath,
  };
}

/** 全ステップの 1行判定 + 失敗ステップの先頭行 + ログパス */
export function formatVerdict(
  results: StepResult[],
  meta: string,
  maxHeadLines = 20,
): string {
  const failed = results.filter((r) => !r.ok);
  const verdict = failed.length === 0 ? 'ok' : 'FAIL';
  const parts = results.map((r) => `${r.name} ${r.summary}`);
  const lines = [`PREFLIGHT ${verdict} | ${meta} | ${parts.join(' | ')}`];
  let budget = maxHeadLines;
  for (const r of failed) {
    for (const h of r.head.slice(0, budget)) {
      lines.push(`  [${r.name}] ${h}`);
      budget -= 1;
    }
    if (r.logPath) lines.push(`  [${r.name}] full log: ${r.logPath}`);
  }
  return lines.join('\n');
}
