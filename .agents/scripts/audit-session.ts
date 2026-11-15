import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { detectRoleFromFirstStep } from '../hooks/guard/agent-access-guard';
import { runDetectors } from './lib/audit/registry';
import { renderFindings } from './lib/audit/render';
import {
  renderStepDetail,
  resolveFullTranscript,
} from './lib/audit/step-detail';
import {
  extractTargetFile,
  extractWriteContent,
  findToolResultRecord,
  isModifyToolName,
} from './lib/audit/tool-helpers';
import { collectSessionTree } from './lib/audit/tree';
import type { AuditContext, Finding } from './lib/audit/types';

export interface TranscriptRecord {
  step_index: number;
  type: string;
  source?: string;
  status?: string;
  content?: string;
  thinking?: string;
  created_at?: string;
  input_tokens?: number;
  cache_read_tokens?: number;
  output_tokens?: number;
  tool_calls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
}

export interface TimeBreakdown {
  thinkSec: number;
  toolSec: number;
  totalSec: number;
}

export interface HookDenial {
  step: number;
  tool: string;
  target: string;
  hookReason: string;
  subsequentTurnAction?: string;
}

export interface BypassEvent {
  step: number;
  type: 'guard_bypass' | 'quality_gate_bypass' | 'command_bypass';
  description: string;
  commandOrSnippet: string;
  thinkingSnippet?: string;
}

export interface SubagentContract {
  step: number;
  name: string;
  hasRules: boolean;
  missingElements: string[];
  systemPromptSnippet: string;
}

export interface CommandInefficiency {
  step: number;
  type: 'raw_command_chain' | 'blind_redo' | 'fail_loop';
  command: string;
  count: number;
}

export interface AuditReport {
  sessionId: string;
  role?: string;
  summary: {
    totalTurns: number;
    time: TimeBreakdown;
    tokens: { input: number; cache: number; output: number };
  };
  hookDenials: HookDenial[];
  bypasses: BypassEvent[];
  subagentContracts: SubagentContract[];
  inefficiencies: CommandInefficiency[];
  childIds: string[];
}

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
  if (!fs.existsSync(base)) return null;
  const candidates = fs
    .readdirSync(base)
    .map((d) => path.join(base, d, rel))
    .filter((p) => fs.existsSync(p))
    .map((p) => ({ p, m: fs.statSync(p).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  return candidates[0]?.p ?? null;
}

function parseIso(ts: string | undefined): number | null {
  if (!ts) return null;
  const ms = Date.parse(ts);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * LLM思考時間 (Think Time) vs ツール実行時間 (Tool Exec Time) を分離集計
 */
export function extractTimeBreakdown(
  records: TranscriptRecord[],
): TimeBreakdown {
  let thinkMs = 0;
  let toolMs = 0;

  for (let i = 0; i < records.length - 1; i++) {
    const cur = records[i];
    const nxt = records[i + 1];
    const curTime = parseIso(cur.created_at);
    const nxtTime = parseIso(nxt.created_at);

    if (curTime === null || nxtTime === null) continue;
    const diff = Math.max(0, nxtTime - curTime);

    // ユーザー入力またはツール結果から、モデル応答まで = モデル思考時間
    if (
      (cur.type === 'USER_INPUT' ||
        cur.type === 'GENERIC' ||
        cur.type === 'SYSTEM_MESSAGE') &&
      nxt.type === 'PLANNER_RESPONSE'
    ) {
      thinkMs += diff;
    }
    // モデルがツール呼び出しを行ってから、ツール結果が返るまで = ツール実行時間
    else if (cur.type === 'PLANNER_RESPONSE' && nxt.type === 'GENERIC') {
      toolMs += diff;
    }
  }

  const thinkSec = Math.round(thinkMs / 1000);
  const toolSec = Math.round(toolMs / 1000);
  return {
    thinkSec,
    toolSec,
    totalSec: thinkSec + toolSec,
  };
}

/**
 * Hook による拒否（Deny）と、その直後のアクション（回避行動）を抽出
 */
export function detectHookDenials(records: TranscriptRecord[]): HookDenial[] {
  const denials: HookDenial[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (r.status === 'DONE') continue;
    const content = r.content ?? '';
    const isDenied =
      content.includes('tool call denied by pre-tool hook') ||
      content.includes('[GUARD]') ||
      content.includes('[GATEGUARD]');

    if (isDenied && r.type === 'GENERIC') {
      // 拒否されたツール呼び出しを特定 (直前の PLANNER_RESPONSE 内の対応インデックス)
      let prevIdx = -1;
      let genericOffset = 0;
      for (let j = i - 1; j >= 0; j--) {
        if (records[j].type === 'PLANNER_RESPONSE') {
          prevIdx = j;
          break;
        }
        if (records[j].type === 'GENERIC') {
          genericOffset++;
        }
      }
      const prev = prevIdx >= 0 ? records[prevIdx] : undefined;
      const tc = prev?.tool_calls?.[genericOffset] ?? prev?.tool_calls?.[0];
      const tool = tc?.name ?? 'unknown';
      const target = String(
        tc?.args?.CommandLine ?? (tc ? extractTargetFile(tc) : ''),
      ).slice(0, 80);

      // 拒否直後のアクション (直後の PLANNER_RESPONSE)
      const next = records
        .slice(i + 1)
        .find((p) => p.type === 'PLANNER_RESPONSE');
      const nextTc = next?.tool_calls?.[0];
      let subsequentTurnAction: string | undefined;
      if (nextTc) {
        const nextTarget = String(
          nextTc.args?.CommandLine ?? extractTargetFile(nextTc),
        ).slice(0, 80);
        subsequentTurnAction = `${nextTc.name}: ${nextTarget}`;
      }

      denials.push({
        step: r.step_index,
        tool,
        target,
        hookReason: content
          .replace(/^[\s\S]*?(\[GUARD\]|\[GATEGUARD\]|tool call denied)/i, '$1')
          .trim()
          .slice(0, 150),
        subsequentTurnAction,
      });
    }
  }

  return denials;
}

/**
 * ガード回避 (cat, head, bun -e) や品質ゲート骨抜き (biome-ignore, test.skip, any) を検知
 */
export function detectBypasses(records: TranscriptRecord[]): BypassEvent[] {
  const bypasses: BypassEvent[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];

    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        const cmd = String(tc.args?.CommandLine ?? '');
        const content = extractWriteContent(tc);
        const targetFile = extractTargetFile(tc);
        const isAppFile =
          !targetFile || /(?:^|\/)(?:src|extension|tests)\//.test(targetFile);

        // 1. 品質バイパス: biome-ignore, test.skip, @ts-expect-error, vi.mock(store)
        if (isModifyToolName(tc.name) && content && isAppFile) {
          if (content.includes('biome-ignore')) {
            bypasses.push({
              step: r.step_index,
              type: 'quality_gate_bypass',
              description: 'Inserted biome-ignore to suppress lint errors',
              commandOrSnippet: content.slice(0, 100),
              thinkingSnippet: r.thinking?.slice(0, 100),
            });
          }
          if (/\b(?:test|it|describe)\.skip\b/.test(content)) {
            bypasses.push({
              step: r.step_index,
              type: 'quality_gate_bypass',
              description: 'Inserted test.skip to bypass failing tests',
              commandOrSnippet: content.slice(0, 100),
              thinkingSnippet: r.thinking?.slice(0, 100),
            });
          }
          if (/@ts-(?:ignore|expect-error)/.test(content)) {
            bypasses.push({
              step: r.step_index,
              type: 'quality_gate_bypass',
              description: 'Inserted @ts-ignore / @ts-expect-error',
              commandOrSnippet: content.slice(0, 100),
              thinkingSnippet: r.thinking?.slice(0, 100),
            });
          }
          if (
            /\.(?:test|spec)\.[tj]sx?$/.test(targetFile) &&
            /\b(?:vi|jest)\.mock\s*\(\s*['"][^'"]*(?:\/stores\/|-store\b)[^'"]*['"]/.test(
              content,
            )
          ) {
            bypasses.push({
              step: r.step_index,
              type: 'quality_gate_bypass',
              description: 'Mocked internal Zustand store (R12 violation)',
              commandOrSnippet: content.slice(0, 100),
              thinkingSnippet: r.thinking?.slice(0, 100),
            });
          }
        }

        // 2. コマンドラインでのガード回避: --no-verify や生 git commit
        if (tc.name === 'run_command' && cmd) {
          if (cmd.includes('--no-verify')) {
            bypasses.push({
              step: r.step_index,
              type: 'command_bypass',
              description: 'Used --no-verify to skip verification hooks',
              commandOrSnippet: cmd.slice(0, 100),
              thinkingSnippet: r.thinking?.slice(0, 100),
            });
          }
        }
      }
    }

    // 3. 直前の Hook Deny に呼応した読込ガード迂回 (cat / head / rtk read -m)
    const prev = records[i - 1];
    if (
      prev?.type === 'GENERIC' &&
      (prev.content?.includes('denied by pre-tool hook') ||
        prev.content?.includes('[GUARD]')) &&
      r.type === 'PLANNER_RESPONSE' &&
      r.tool_calls?.[0]
    ) {
      const tc = r.tool_calls[0];
      const cmd = String(tc.args?.CommandLine ?? '');
      if (
        tc.name === 'run_command' &&
        /^(?:cat|head|tail|sed|rtk\s+read\s+-m|bun\s+-e|node\s+-e)\b/.test(
          cmd.trim(),
        )
      ) {
        bypasses.push({
          step: r.step_index,
          type: 'guard_bypass',
          description: `Attempted bypass via shell command after guard denial: ${cmd.split(/\s+/)[0]}`,
          commandOrSnippet: cmd.slice(0, 100),
          thinkingSnippet: r.thinking?.slice(0, 100),
        });
      }
    }
  }

  return bypasses;
}

/**
 * サブエージェントの動的定義 (define_subagent) において、
 * トークン削減ルールや ai:check が注入されているかを検証
 */
export function detectSubagentContracts(
  records: TranscriptRecord[],
): SubagentContract[] {
  const contracts: SubagentContract[] = [];

  for (const r of records) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (tc.name === 'define_subagent' && tc.args) {
          const name = String(tc.args.name ?? '');
          const prompt = String(tc.args.system_prompt ?? '');
          const missing: string[] = [];

          const mentionsRules =
            prompt.includes('efficient-exploration') ||
            prompt.includes('トークン') ||
            prompt.includes('150行') ||
            prompt.includes('ai:peek') ||
            prompt.includes('ai:impact');
          if (!mentionsRules) missing.push('token_reduction_rules');

          const mentionsCheck =
            prompt.includes('ai:check') || prompt.includes('ai:commit');
          if (!mentionsCheck) missing.push('aggregated_check_scripts');

          contracts.push({
            step: r.step_index,
            name,
            hasRules: missing.length === 0,
            missingElements: missing,
            systemPromptSnippet: prompt.slice(0, 120),
          });
        }
      }
    }
  }

  return contracts;
}

/**
 * 指定ステップ以降に invoke_subagent で生成された子サブエージェントID (conversationId) を抽出
 */
export function findChildSubagentIds(
  records: TranscriptRecord[],
  fromStep = 0,
): string[] {
  const ids: string[] = [];
  const idRegex = /"conversationId":\s*"([^"]+)"/g;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (r.step_index < fromStep) continue;

    if (
      r.type === 'GENERIC' &&
      r.content &&
      /Created the following subagents?:/i.test(r.content)
    ) {
      let m = idRegex.exec(r.content);
      while (m !== null) {
        if (!ids.includes(m[1])) {
          ids.push(m[1]);
        }
        m = idRegex.exec(r.content);
      }
    }
  }

  return ids;
}

/**
 * 単一セッションの監査実行
 */
export function auditSession(
  records: TranscriptRecord[],
  options?: { sessionId?: string; fromStep?: number; fromRequest?: string },
): AuditReport {
  let filtered = records;

  if (options?.fromRequest) {
    const reqIdx = records.findIndex(
      (r) =>
        r.type === 'USER_INPUT' &&
        r.content &&
        r.content.includes(options.fromRequest!),
    );
    if (reqIdx !== -1) {
      const startStep = records[reqIdx].step_index;
      filtered = records.filter((r) => r.step_index >= startStep);
    }
  } else if (options?.fromStep !== undefined) {
    filtered = records.filter((r) => r.step_index >= options.fromStep!);
  }

  const time = extractTimeBreakdown(filtered);
  const hookDenials = detectHookDenials(filtered);
  const bypasses = detectBypasses(filtered);
  const subagentContracts = detectSubagentContracts(filtered);
  const childIds = findChildSubagentIds(filtered, 0);

  // トークン合計
  let inputTokens = 0;
  let cacheTokens = 0;
  let outputTokens = 0;
  for (const r of filtered) {
    inputTokens += r.input_tokens ?? 0;
    cacheTokens += r.cache_read_tokens ?? 0;
    outputTokens += r.output_tokens ?? 0;
  }

  // 非効率コマンド (REDO や FAIL ループ)
  const inefficiencies: CommandInefficiency[] = [];
  let prevCmd = '';
  for (const r of filtered) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (tc.name === 'run_command') {
          const cmd = String(tc.args?.CommandLine ?? '').trim();
          if (cmd && cmd === prevCmd) {
            inefficiencies.push({
              step: r.step_index,
              type: 'blind_redo',
              command: cmd.slice(0, 60),
              count: 1,
            });
          }
          prevCmd = cmd;
        }
      }
    }
  }

  // 役割の推定 (detectRoleFromFirstStep 優先)
  const firstStep = filtered[0];
  const detectedRole = firstStep
    ? detectRoleFromFirstStep(firstStep)
    : 'unknown';
  let role = 'Unknown';
  if (detectedRole === 'planner') {
    role = 'Planner / Coordinator';
  } else if (detectedRole === 'worker') {
    role = 'Worker';
  } else if (detectedRole === 'reviewer') {
    role = 'Reviewer';
  } else if (detectedRole === 'scout') {
    role = 'Scout / Inspector';
  } else if (detectedRole === 'auditor') {
    role = 'Auditor';
  } else if (detectedRole === 'architect') {
    role = 'Architect';
  } else {
    const firstPlanner = filtered.find((r) => r.type === 'PLANNER_RESPONSE');
    role = firstPlanner?.tool_calls?.some((t) => t.name === 'invoke_subagent')
      ? 'Planner / Coordinator'
      : filtered.some((r) =>
            r.tool_calls?.some((t) => isModifyToolName(t.name)),
          )
        ? 'Worker'
        : 'Scout / Inspector';
  }

  return {
    sessionId: options?.sessionId ?? 'current',
    role,
    summary: {
      totalTurns: filtered.filter((r) => r.type === 'PLANNER_RESPONSE').length,
      time,
      tokens: { input: inputTokens, cache: cacheTokens, output: outputTokens },
    },
    hookDenials,
    bypasses,
    subagentContracts,
    inefficiencies,
    childIds,
  };
}

const k = (n: number) => `${Math.round(n / 1000)}K`;

export function renderAuditReport(report: AuditReport): string {
  const s = report.summary;
  const lines: string[] = [
    `=== AUDIT REPORT: ${report.sessionId} [${report.role ?? 'Unknown'}] ===`,
    `Turns: ${s.totalTurns} | Duration: ${s.time.totalSec}s (Think: ${s.time.thinkSec}s / Tool: ${s.time.toolSec}s)`,
    `Tokens: In+Cache=${k(s.tokens.input + s.tokens.cache)} (In: ${k(s.tokens.input)}, Cache: ${k(s.tokens.cache)}) | Out: ${s.tokens.output}`,
  ];

  if (report.hookDenials.length > 0) {
    lines.push(`\n[Hook Denials: ${report.hookDenials.length}件]`);
    for (const d of report.hookDenials) {
      lines.push(`  Step ${d.step} [${d.tool}] -> ${d.hookReason}`);
      if (d.subsequentTurnAction) {
        lines.push(`    └ Subsequent Action: ${d.subsequentTurnAction}`);
      }
    }
  } else {
    lines.push('\n[Hook Denials: 0件 (No blockades)]');
  }

  if (report.bypasses.length > 0) {
    lines.push(`\n[Bypasses / Loopholes: ${report.bypasses.length}件]`);
    for (const b of report.bypasses) {
      lines.push(`  Step ${b.step} [${b.type}] ${b.description}`);
      lines.push(`    Snippet: ${b.commandOrSnippet}`);
    }
  }

  if (report.subagentContracts.length > 0) {
    lines.push(
      `\n[Subagent Definition Audits: ${report.subagentContracts.length}件]`,
    );
    for (const c of report.subagentContracts) {
      const mark = c.hasRules ? 'OK' : 'VIOLATION (Naked Subagent)';
      lines.push(`  Step ${c.step} [${c.name}]: ${mark}`);
      if (!c.hasRules) {
        lines.push(`    Missing: ${c.missingElements.join(', ')}`);
        lines.push(`    Prompt: "${c.systemPromptSnippet}..."`);
      }
    }
  }

  if (report.inefficiencies.length > 0) {
    lines.push(
      `\n[Inefficiencies (Redo/Loops): ${report.inefficiencies.length}件]`,
    );
    for (const inef of report.inefficiencies.slice(0, 10)) {
      lines.push(`  Step ${inef.step} [${inef.type}] ${inef.command}`);
    }
  }

  if (report.childIds.length > 0) {
    lines.push(`\n[Spawned Subagents: ${report.childIds.length}件]`);
    for (const id of report.childIds) {
      lines.push(`  - ${id}`);
    }
  }

  return lines.join('\n');
}

export function renderComparisonTable(a: AuditReport, b: AuditReport): string {
  const sa = a.summary;
  const sb = b.summary;

  const totalTokensA = sa.tokens.input + sa.tokens.cache;
  const totalTokensB = sb.tokens.input + sb.tokens.cache;

  const calcDiff = (vA: number, vB: number) => {
    if (vA === 0) return '-';
    const pct = Math.round(((vB - vA) / vA) * 100);
    return pct > 0 ? `+${pct}%` : `${pct}%`;
  };

  const rows: [string, string, string, string][] = [
    ['Session ID', a.sessionId.slice(0, 8), b.sessionId.slice(0, 8), '—'],
    ['Role', a.role ?? 'Unknown', b.role ?? 'Unknown', '—'],
    [
      'Turns (ターン数)',
      `${sa.totalTurns}`,
      `${sb.totalTurns}`,
      calcDiff(sa.totalTurns, sb.totalTurns),
    ],
    [
      'Duration (所要時間)',
      `${sa.time.totalSec}s (Think: ${sa.time.thinkSec}s / Tool: ${sa.time.toolSec}s)`,
      `${sb.time.totalSec}s (Think: ${sb.time.thinkSec}s / Tool: ${sb.time.toolSec}s)`,
      calcDiff(sa.time.totalSec, sb.time.totalSec),
    ],
    [
      'Tokens (Total In+Cache)',
      `${k(totalTokensA)}`,
      `${k(totalTokensB)}`,
      calcDiff(totalTokensA, totalTokensB),
    ],
    [
      'Tokens (Out)',
      `${sa.tokens.output}`,
      `${sb.tokens.output}`,
      calcDiff(sa.tokens.output, sb.tokens.output),
    ],
    [
      'Hook Denials (遮断)',
      `${a.hookDenials.length}件`,
      `${b.hookDenials.length}件`,
      '—',
    ],
    [
      'Inefficiencies (Redo/Loops)',
      `${a.inefficiencies.length}件`,
      `${b.inefficiencies.length}件`,
      '—',
    ],
    [
      'Bypasses (回避)',
      `${a.bypasses.length}件`,
      `${b.bypasses.length}件`,
      '—',
    ],
  ];

  const header =
    '| 指標 (Metric) | Session A (Before) | Session B (After) | 差分 (Diff) |\n| :--- | :--- | :--- | :--- |';
  const body = rows
    .map(
      ([metric, valA, valB, diff]) =>
        `| **${metric}** | ${valA} | ${valB} | ${diff} |`,
    )
    .join('\n');

  return `=== SESSION COMPARISON ===\n\n${header}\n${body}\n`;
}

export interface StepSummary {
  step: number;
  type: string;
  tool?: string;
  target?: string;
  flag?: string;
}

export function extractStepSummaries(
  records: TranscriptRecord[],
  range?: { start?: number; end?: number },
): StepSummary[] {
  const filtered = records.filter((r) => {
    if (range?.start !== undefined && r.step_index < range.start) return false;
    if (range?.end !== undefined && r.step_index > range.end) return false;
    return true;
  });

  const summaries: StepSummary[] = [];

  for (let i = 0; i < filtered.length; i++) {
    const r = filtered[i];
    if (
      r.type === 'PLANNER_RESPONSE' &&
      r.tool_calls &&
      r.tool_calls.length > 0
    ) {
      for (let tcIdx = 0; tcIdx < r.tool_calls.length; tcIdx++) {
        const tc = r.tool_calls[tcIdx];
        const target = String(
          tc.args?.CommandLine ??
            (extractTargetFile(tc) || tc.args?.TypeName || ''),
        ).slice(0, 90);

        const nxt =
          findToolResultRecord(records, records.indexOf(r), tcIdx) ??
          records.find((x) => x.step_index === r.step_index + 1);
        let flag: string | undefined;
        if (nxt?.content) {
          if (
            nxt.content.includes('denied by pre-tool hook') ||
            nxt.content.includes('[GUARD]') ||
            nxt.content.includes('[GATEGUARD]')
          ) {
            flag = 'DENIED';
          } else if (
            nxt.content.includes('Encountered error') ||
            nxt.content.includes('exited with code 1')
          ) {
            flag = 'FAIL';
          }
        }

        summaries.push({
          step: r.step_index,
          type: r.type,
          tool: tc.name,
          target,
          flag,
        });
      }
    } else if (r.type === 'USER_INPUT') {
      summaries.push({
        step: r.step_index,
        type: 'USER_INPUT',
        target: (r.content ?? '').slice(0, 90),
      });
    }
  }

  return summaries;
}

export function renderStepSummaries(summaries: StepSummary[]): string {
  const lines: string[] = [
    'Step | Tool / Type | Target / Command | Flag',
    '---|---|---|---',
  ];
  for (const s of summaries) {
    const tool = s.tool ?? s.type;
    const flag = s.flag ? `**${s.flag}**` : '';
    lines.push(`${s.step} | ${tool} | ${s.target ?? ''} | ${flag}`);
  }
  return lines.join('\n');
}

export function listRecentSessions(limit = 15): string {
  const base = brainDir();
  if (!fs.existsSync(base)) {
    return '(No brain directory found)';
  }
  const rel = '.system_generated/logs/transcript.jsonl';
  const entries = fs
    .readdirSync(base)
    .map((id) => {
      const p = path.join(base, id, rel);
      return fs.existsSync(p)
        ? { id, p, mtimeMs: fs.statSync(p).mtimeMs }
        : null;
    })
    .filter((x): x is { id: string; p: string; mtimeMs: number } => x !== null)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, limit);

  if (entries.length === 0) {
    return '(No sessions found)';
  }

  const lines: string[] = [
    'Session ID | Updated | Role | Turns | First Request',
    '---|---|---|---|---',
  ];

  for (const e of entries) {
    try {
      const records = parseJsonl(fs.readFileSync(e.p, 'utf8'));
      const first = records[0];
      const role = first ? detectRoleFromFirstStep(first) : 'unknown';
      const turns = records.filter((r) => r.type === 'PLANNER_RESPONSE').length;
      const req = (first?.content ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 50);
      const dt = new Date(e.mtimeMs)
        .toISOString()
        .slice(0, 16)
        .replace('T', ' ');
      lines.push(`${e.id} | ${dt} | ${role} | ${turns} | ${req}`);
    } catch {
      lines.push(`${e.id} | error | unknown | 0 | (unreadable)`);
    }
  }
  return lines.join('\n');
}

export function main(argv: string[]): number {
  const flags = argv.filter((a) => a.startsWith('--'));
  const pos = argv.filter((a) => !a.startsWith('--'));

  // 0. --list モード
  if (flags.includes('--list') || flags.some((f) => f.startsWith('--list='))) {
    const listFlag = flags.find((f) => f.startsWith('--list='));
    const rawLimit = listFlag ? listFlag.slice('--list='.length) : pos[0];
    const parsed = rawLimit ? Number.parseInt(rawLimit, 10) : 15;
    const limit = Number.isNaN(parsed) || parsed <= 0 ? 15 : parsed;
    console.log(listRecentSessions(limit));
    return 0;
  }

  // 1. --compare モード
  if (flags.includes('--compare')) {
    if (pos.length < 2) {
      console.error(
        '[ERROR] --compare requires two session IDs. Example: bun run ai:audit --compare <id1> <id2>',
      );
      return 1;
    }
    const file1 = resolveTranscript(pos[0]);
    const file2 = resolveTranscript(pos[1]);
    if (!file1 || !file2) {
      console.error(
        `[ERROR] One or both transcripts not found: ${pos[0]} / ${pos[1]}`,
      );
      return 1;
    }
    const report1 = auditSession(parseJsonl(fs.readFileSync(file1, 'utf8')), {
      sessionId: pos[0],
    });
    const report2 = auditSession(parseJsonl(fs.readFileSync(file2, 'utf8')), {
      sessionId: pos[1],
    });
    console.log(renderComparisonTable(report1, report2));
    return 0;
  }

  // 2. --steps モード
  if (flags.includes('--steps')) {
    const targetArg = pos[0];
    const file = resolveTranscript(targetArg);
    if (!file) {
      console.error(
        `[ERROR] transcript not found for: ${targetArg ?? 'latest'}`,
      );
      return 1;
    }
    let start: number | undefined;
    let end: number | undefined;
    const rangeFlag = flags.find((f) => f.startsWith('--range='));
    const rangeVal = rangeFlag
      ? rangeFlag.slice('--range='.length)
      : flags.includes('--range')
        ? pos[1]
        : undefined;

    if (rangeVal) {
      const parts = rangeVal
        .split(':')
        .map((p) => Number.parseInt(p.trim(), 10));
      if (!Number.isNaN(parts[0])) start = parts[0];
      if (!Number.isNaN(parts[1])) end = parts[1];
    }

    const records = parseJsonl(fs.readFileSync(file, 'utf8'));
    const summaries = extractStepSummaries(records, { start, end });
    console.log(renderStepSummaries(summaries));
    return 0;
  }

  // 3. --step-detail モード
  if (
    flags.includes('--step-detail') ||
    flags.some((f) => f.startsWith('--step-detail='))
  ) {
    let rangeStr: string | undefined;
    const stepDetailFlag = flags.find((f) => f.startsWith('--step-detail='));
    if (stepDetailFlag) {
      rangeStr = stepDetailFlag.slice('--step-detail='.length);
    }
    let targetArg: string | undefined;
    for (const p of pos) {
      if (/^\d+(?::\d+)?$/.test(p) && !rangeStr) {
        rangeStr = p;
      } else if (!targetArg) {
        targetArg = p;
      }
    }
    const file = resolveFullTranscript(targetArg);
    if (!file) {
      console.error(
        `[ERROR] transcript not found for: ${targetArg ?? 'latest'}`,
      );
      return 1;
    }
    let start = 0;
    let end = 10;
    if (rangeStr) {
      const parts = rangeStr
        .split(':')
        .map((x) => Number.parseInt(x.trim(), 10));
      if (!Number.isNaN(parts[0])) start = parts[0];
      if (parts.length > 1 && !Number.isNaN(parts[1])) end = parts[1];
      else if (parts.length === 1) end = start + 10;
    }
    const records = parseJsonl(fs.readFileSync(file, 'utf8'));
    console.log(renderStepDetail(records, { start, end }));
    return 0;
  }

  const targetArg = pos[0];
  const file = resolveTranscript(targetArg);
  if (!file) {
    console.error(`[ERROR] transcript not found for: ${targetArg ?? 'latest'}`);
    return 1;
  }

  const fromReqFlag = flags.find((f) => f.startsWith('--from-request='));
  const fromRequest = fromReqFlag
    ? fromReqFlag.slice('--from-request='.length)
    : flags.includes('--from-request')
      ? pos[1]
      : undefined;

  const isTree = flags.includes('--tree');
  const isJson = flags.includes('--json');
  const isCompact = flags.includes('--compact');

  const rawJsonl = fs.readFileSync(file, 'utf8');
  const records = parseJsonl(rawJsonl);
  const sessionId = path.basename(
    path.dirname(path.dirname(path.dirname(file))),
  );

  const report = auditSession(records, { sessionId, fromRequest });

  if (isTree) {
    const treeNodes = collectSessionTree(sessionId);
    let effectiveNodes =
      treeNodes.length > 0 ? treeNodes : [{ sessionId, depth: 0, records }];

    if (fromRequest) {
      const allowedChildren = new Set([sessionId, ...report.childIds]);
      effectiveNodes = effectiveNodes.filter(
        (n) => n.sessionId === sessionId || allowedChildren.has(n.sessionId),
      );
    }

    const allReports: AuditReport[] = [];
    const allFindings: Finding[] = [];
    const roleCounts = new Map<string, number>();

    for (const node of effectiveNodes) {
      const rep = auditSession(node.records, {
        sessionId: node.sessionId,
        fromRequest: node.sessionId === sessionId ? fromRequest : undefined,
      });
      allReports.push(rep);
      const roleLabel = rep.role ?? 'Unknown';
      roleCounts.set(roleLabel, (roleCounts.get(roleLabel) ?? 0) + 1);

      const first = node.records[0];
      const role = first ? detectRoleFromFirstStep(first) : 'unknown';
      const ctx: AuditContext = {
        sessionId: node.sessionId,
        records:
          node.sessionId === sessionId && fromRequest
            ? node.records.filter(
                (r) =>
                  r.step_index >=
                  (records.find(
                    (x) =>
                      x.type === 'USER_INPUT' &&
                      x.content?.includes(fromRequest),
                  )?.step_index ?? 0),
              )
            : node.records,
        role,
        childIds: rep.childIds,
      };
      allFindings.push(...runDetectors(ctx));
    }

    if (isJson) {
      console.log(
        JSON.stringify({ reports: allReports, findings: allFindings }, null, 2),
      );
      return 0;
    }

    for (const r of allReports) {
      const hasIssues =
        r.sessionId === sessionId ||
        r.hookDenials.length > 0 ||
        r.bypasses.length > 0 ||
        r.inefficiencies.length > 0 ||
        allFindings.some(
          (f) => f.sessionId === r.sessionId && f.severity !== 'INFO',
        );
      if (isCompact && !hasIssues) {
        console.log(
          `=== AUDIT REPORT (COMPACT): ${r.sessionId} [${r.role ?? 'Unknown'}] Turns=${r.summary.totalTurns} Tokens=${k(r.summary.tokens.input + r.summary.tokens.cache)} (Clean) ===`,
        );
      } else {
        console.log(renderAuditReport(r));
      }
      console.log(
        '\n------------------------------------------------------------\n',
      );
    }

    console.log('=== AUDIT FINDINGS ===');
    console.log(renderFindings(allFindings));
    console.log('');

    console.log('=== TREE SUMMARY ===');
    const totalSessions = allReports.length;
    const totalTurns = allReports.reduce(
      (sum, r) => sum + r.summary.totalTurns,
      0,
    );
    const totalDuration = allReports.reduce(
      (sum, r) => sum + r.summary.time.totalSec,
      0,
    );
    const thinkSec = allReports.reduce(
      (sum, r) => sum + r.summary.time.thinkSec,
      0,
    );
    const toolSec = allReports.reduce(
      (sum, r) => sum + r.summary.time.toolSec,
      0,
    );
    const totalInput = allReports.reduce(
      (sum, r) => sum + r.summary.tokens.input,
      0,
    );
    const totalCache = allReports.reduce(
      (sum, r) => sum + r.summary.tokens.cache,
      0,
    );
    const totalOutput = allReports.reduce(
      (sum, r) => sum + r.summary.tokens.output,
      0,
    );
    const totalDenials = allReports.reduce(
      (sum, r) => sum + r.hookDenials.length,
      0,
    );
    const totalBypasses = allReports.reduce(
      (sum, r) => sum + r.bypasses.length,
      0,
    );
    const totalIneff = allReports.reduce(
      (sum, r) => sum + r.inefficiencies.length,
      0,
    );
    const highCount = allFindings.filter((f) => f.severity === 'HIGH').length;
    const medCount = allFindings.filter((f) => f.severity === 'MED').length;
    const lowCount = allFindings.filter((f) => f.severity === 'LOW').length;
    const infoCount = allFindings.filter((f) => f.severity === 'INFO').length;
    const rolesText = Array.from(roleCounts.entries())
      .map(([name, cnt]) => `${name}=${cnt}`)
      .join(', ');

    console.log(`Sessions: ${totalSessions} (${rolesText})`);
    console.log(`Total Turns: ${totalTurns}`);
    console.log(
      `Duration: ${totalDuration}s (Think: ${thinkSec}s / Tool: ${toolSec}s)`,
    );
    console.log(
      `Total Tokens: In+Cache=${k(totalInput + totalCache)} (In: ${k(totalInput)}, Cache: ${k(totalCache)}) | Out: ${totalOutput}`,
    );
    console.log(
      `Hook Denials: ${totalDenials}件 | Bypasses: ${totalBypasses}件 | Inefficiencies: ${totalIneff}件`,
    );
    console.log(
      `Findings: HIGH=${highCount}, MED=${medCount}, LOW=${lowCount}, INFO=${infoCount}`,
    );
    return 0;
  }

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderAuditReport(report));
  }

  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
