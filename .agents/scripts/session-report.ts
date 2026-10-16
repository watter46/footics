import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// ---- Budget (notes/agent-ideal-trace.md と同値) ---------------------------------
export const BUDGET = {
  maxTurns: 6,
  maxFail: 0,
  maxRedo: 1,
  maxMergeable: 1,
  maxResultBytes: 1536,
} as const;

export interface TranscriptRecord {
  step_index: number;
  type: string;
  source?: string;
  content?: string;
  input_tokens?: number;
  cache_read_tokens?: number;
  output_tokens?: number;
  tool_calls?: { name: string; args: Record<string, unknown> }[];
}

export interface TurnRow {
  turn: number;
  tool: string;
  target: string;
  input: number;
  cache: number;
  output: number;
  resultBytes: number;
  calls: number;
  flags: string[];
  readOnly: boolean;
}

export interface SegmentReport {
  index: number;
  request: string;
  rows: TurnRow[];
  totals: { input: number; cache: number; output: number; turns: number };
  counts: {
    fail: number;
    redo: number;
    mergeable: number;
    maxResultBytes: number;
  };
  budgetOk: boolean;
  failures: string[];
}

const READ_ONLY_FAMILIES = [
  'git status',
  'git log',
  'git diff',
  'ls',
  'read',
  'grep',
  'find',
  'json',
  'deps',
];
const EXIT_RE = /exited with code (\d+)/;

export function parseJsonl(text: string): TranscriptRecord[] {
  return text
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as TranscriptRecord];
      } catch {
        return [];
      }
    });
}

function unquote(s: unknown): string {
  return String(s ?? '').replace(/^"|"$/g, '');
}

/** コマンドの「系統」キー: rtk / env 代入 / ランナーを除いた先頭2トークン */
export function commandFamily(commandLine: string): string {
  const tokens = unquote(commandLine)
    .split(/\s+/)
    .filter((t) => t.length > 0 && !/^[A-Z_]+=/.test(t));
  const rest = tokens[0] === 'rtk' ? tokens.slice(1) : tokens;
  return rest.slice(0, 2).join(' ');
}

function callTarget(call: {
  name: string;
  args: Record<string, unknown>;
}): string {
  const a = call.args;
  return unquote(a.CommandLine ?? a.AbsolutePath ?? a.TargetFile ?? '').slice(
    0,
    60,
  );
}

function isReadOnly(call: {
  name: string;
  args: Record<string, unknown>;
}): boolean {
  if (call.name === 'view_file') return true;
  if (call.name !== 'run_command') return false;
  const fam = commandFamily(String(call.args.CommandLine ?? ''));
  return READ_ONLY_FAMILIES.some((f) => fam === f || fam.startsWith(`${f} `));
}

function resultFor(
  records: TranscriptRecord[],
  stepIndex: number,
): TranscriptRecord | undefined {
  return records.find(
    (r) =>
      r.step_index > stepIndex && r.source === 'MODEL' && r.type === 'GENERIC',
  );
}

function failReason(content: string): string | null {
  const m = content.match(EXIT_RE);
  if (m && m[1] !== '0') return `exit${m[1]}`;
  if (/PASS \(0\) FAIL \(0\)/.test(content)) return '0tests';
  return null;
}

function buildRows(
  planners: TranscriptRecord[],
  all: TranscriptRecord[],
): TurnRow[] {
  let prevFamily = '';
  return planners.map((p, i) => {
    const call = p.tool_calls?.[0];
    const result = resultFor(all, p.step_index);
    const content = result?.content ?? '';
    const flags: string[] = [];
    const reason = failReason(content);
    if (reason) flags.push(`FAIL(${reason})`);
    const fam =
      call?.name === 'run_command'
        ? commandFamily(String(call.args.CommandLine ?? ''))
        : '';
    if (fam && fam === prevFamily) flags.push('REDO');
    prevFamily = fam;
    return {
      turn: i + 1,
      tool: call?.name ?? '(none)',
      target: call ? callTarget(call) : '',
      input: p.input_tokens ?? 0,
      cache: p.cache_read_tokens ?? 0,
      output: p.output_tokens ?? 0,
      resultBytes: Buffer.byteLength(content),
      calls: p.tool_calls?.length ?? 0,
      flags,
      readOnly: call ? isReadOnly(call) : false,
    };
  });
}

/** 連続する単一呼び出しの read-only ターンの「まとめ可能数」 (run長 - 1 の総和) */
export function countMergeable(rows: TurnRow[]): number {
  let total = 0;
  let run = 0;
  for (const r of [...rows, null]) {
    if (r && r.readOnly && r.calls === 1) {
      run += 1;
      continue;
    }
    if (run > 1) total += run - 1;
    run = 0;
  }
  return total;
}

function evaluate(
  rows: TurnRow[],
): SegmentReport['counts'] & { failures: string[] } {
  const fail = rows.filter((r) =>
    r.flags.some((f) => f.startsWith('FAIL')),
  ).length;
  const redo = rows.filter((r) => r.flags.includes('REDO')).length;
  const mergeable = countMergeable(rows);
  const maxResultBytes = Math.max(0, ...rows.map((r) => r.resultBytes));
  const failures: string[] = [];
  if (rows.length > BUDGET.maxTurns)
    failures.push(`turns ${rows.length}>${BUDGET.maxTurns}`);
  if (fail > BUDGET.maxFail) failures.push(`fail ${fail}>${BUDGET.maxFail}`);
  if (redo > BUDGET.maxRedo) failures.push(`redo ${redo}>${BUDGET.maxRedo}`);
  if (mergeable > BUDGET.maxMergeable)
    failures.push(`mergeable ${mergeable}>${BUDGET.maxMergeable}`);
  if (maxResultBytes > BUDGET.maxResultBytes)
    failures.push(`maxres ${maxResultBytes}B>${BUDGET.maxResultBytes}B`);
  return { fail, redo, mergeable, maxResultBytes, failures };
}

export function analyze(records: TranscriptRecord[]): SegmentReport[] {
  const segments: TranscriptRecord[][] = [];
  const hasUserInput = records.some((r) => r.type === 'USER_INPUT');

  for (const r of records) {
    if (hasUserInput) {
      if (r.type === 'USER_INPUT') segments.push([r]);
      else if (segments.length > 0) segments[segments.length - 1].push(r);
    } else {
      // サブエージェント形式ログ（USER_INPUT が存在しない場合）
      if (r.type === 'SYSTEM_MESSAGE' || segments.length === 0) {
        segments.push([r]);
      } else {
        segments[segments.length - 1].push(r);
      }
    }
  }
  return segments.map((seg, index) => {
    const planners = seg.filter((r) => r.type === 'PLANNER_RESPONSE');
    const rows = buildRows(planners, seg);
    const ev = evaluate(rows);
    const sum = (k: 'input' | 'cache' | 'output') =>
      rows.reduce((a, r) => a + r[k], 0);
    const rawReq = seg[0]?.content ?? '';
    const cleanReq = rawReq
      .replace(
        /^The following is a <SYSTEM_MESSAGE>[\s\S]*?pay attention to\./gi,
        '',
      )
      .replace(/^The following is a\s+/gi, '')
      .replace(/<\/?(?:SYSTEM_MESSAGE|USER_REQUEST)[^>]*>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
    const request = cleanReq || '(subagent task)';
    return {
      index: index + 1,
      request,
      rows,
      totals: {
        input: sum('input'),
        cache: sum('cache'),
        output: sum('output'),
        turns: rows.length,
      },
      counts: {
        fail: ev.fail,
        redo: ev.redo,
        mergeable: ev.mergeable,
        maxResultBytes: ev.maxResultBytes,
      },
      budgetOk: ev.failures.length === 0,
      failures: ev.failures,
    };
  });
}

const k = (n: number) => `${Math.round(n / 1000)}K`;

export function renderSegment(s: SegmentReport, maxRows = 40): string {
  const t = s.totals;
  const lines = [
    `SEGMENT ${s.index} "${s.request}" turns=${t.turns} tokens(in+cache)=${k(t.input + t.cache)} out=${t.output}`,
    ' T  tool          in    cache  res(B)  flag',
  ];
  for (const r of s.rows.slice(0, maxRows)) {
    lines.push(
      `${String(r.turn).padStart(2)}  ${r.tool.padEnd(12)} ${String(r.input).padStart(5)} ${String(r.cache).padStart(6)} ${String(r.resultBytes).padStart(6)}  ${r.flags.join(',')}`,
    );
  }
  if (s.rows.length > maxRows)
    lines.push(`... +${s.rows.length - maxRows} rows`);
  lines.push(
    s.budgetOk ? 'BUDGET ok' : `BUDGET NG | ${s.failures.join(' | ')}`,
  );
  return lines.join('\n');
}

export function renderReport(segments: SegmentReport[], only?: number): string {
  const head = segments.map(
    (s) =>
      `  #${s.index} turns=${s.totals.turns} in+cache=${k(s.totals.input + s.totals.cache)} ${s.budgetOk ? 'ok' : 'NG'} "${s.request}"`,
  );
  const target = only
    ? segments.find((s) => s.index === only)
    : segments[segments.length - 1];
  return [
    `SESSION segments=${segments.length}`,
    ...head,
    target ? renderSegment(target) : '(no segment)',
  ].join('\n');
}

export function brainDir(): string {
  return (
    process.env.BRAIN_DIR ??
    path.join(os.homedir(), '.gemini/antigravity-cli/brain')
  );
}

export function resolveTranscript(arg: string | undefined): string | null {
  const base = brainDir();
  const rel = '.system_generated/logs/transcript.jsonl';
  if (arg && arg !== 'latest') {
    const p = path.join(base, arg, rel);
    return fs.existsSync(p) ? p : null;
  }
  const candidates = fs
    .readdirSync(base)
    .map((d) => path.join(base, d, rel))
    .filter((p) => fs.existsSync(p))
    .map((p) => ({ p, m: fs.statSync(p).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  return candidates[0]?.p ?? null;
}

export function main(argv: string[]): number {
  const flags = argv.filter((a) => a.startsWith('--'));
  const pos = argv.filter((a) => !a.startsWith('--'));
  const file = resolveTranscript(pos[0]);
  if (!file) {
    console.error('[ERROR] transcript not found');
    return 1;
  }
  const segments = analyze(parseJsonl(fs.readFileSync(file, 'utf8')));
  if (flags.includes('--json')) {
    console.log(JSON.stringify(segments.map(({ rows: _r, ...rest }) => rest)));
    return 0;
  }
  const segFlag = flags.find((f) => f.startsWith('--segment='));
  console.log(
    renderReport(segments, segFlag ? Number(segFlag.slice(10)) : undefined),
  );
  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
