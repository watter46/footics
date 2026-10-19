import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

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
    const content = r.content ?? '';
    const isDenied =
      content.includes('tool call denied by pre-tool hook') ||
      content.includes('[GUARD]') ||
      content.includes('[GATEGUARD]');

    if (isDenied && r.type === 'GENERIC') {
      // 拒否されたツール呼び出しを特定 (直前の PLANNER_RESPONSE)
      const prev = records
        .slice(0, i)
        .reverse()
        .find((p) => p.type === 'PLANNER_RESPONSE');
      const tc = prev?.tool_calls?.[0];
      const tool = tc?.name ?? 'unknown';
      const target = String(
        tc?.args?.CommandLine ??
          tc?.args?.AbsolutePath ??
          tc?.args?.TargetFile ??
          '',
      ).slice(0, 80);

      // 拒否直後のアクション (直後の PLANNER_RESPONSE)
      const next = records
        .slice(i + 1)
        .find((p) => p.type === 'PLANNER_RESPONSE');
      const nextTc = next?.tool_calls?.[0];
      let subsequentTurnAction: string | undefined;
      if (nextTc) {
        const nextTarget = String(
          nextTc.args?.CommandLine ??
            nextTc.args?.AbsolutePath ??
            nextTc.args?.TargetFile ??
            '',
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
        const content = String(
          tc.args?.ReplacementContent ?? tc.args?.CodeContent ?? '',
        );

        // 1. 品質バイパス: biome-ignore, test.skip, as any, @ts-expect-error
        if (
          (tc.name === 'replace_file_content' || tc.name === 'write_to_file') &&
          content
        ) {
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
            prompt.includes('400行') ||
            prompt.includes('repo_summary');
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
      r.content.includes('Created the following subagents:')
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
    if (
      r.type === 'PLANNER_RESPONSE' &&
      r.tool_calls?.[0]?.name === 'run_command'
    ) {
      const cmd = String(r.tool_calls[0].args?.CommandLine ?? '').trim();
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

  // 役割の簡易推定
  const firstPlanner = filtered.find((r) => r.type === 'PLANNER_RESPONSE');
  const role = firstPlanner?.tool_calls?.some(
    (t) => t.name === 'invoke_subagent',
  )
    ? 'Planner / Coordinator'
    : filtered.some((r) =>
          r.tool_calls?.some((t) => t.name === 'replace_file_content'),
        )
      ? 'Worker'
      : 'Scout / Inspector';

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

export function main(argv: string[]): number {
  const flags = argv.filter((a) => a.startsWith('--'));
  const pos = argv.filter((a) => !a.startsWith('--'));

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

  const rawJsonl = fs.readFileSync(file, 'utf8');
  const records = parseJsonl(rawJsonl);
  const sessionId = path.basename(
    path.dirname(path.dirname(path.dirname(file))),
  );

  const report = auditSession(records, { sessionId, fromRequest });

  if (isTree && report.childIds.length > 0) {
    const allReports = [report];
    for (const childId of report.childIds) {
      const childFile = resolveTranscript(childId);
      if (childFile) {
        const childRecords = parseJsonl(fs.readFileSync(childFile, 'utf8'));
        allReports.push(auditSession(childRecords, { sessionId: childId }));
      }
    }

    if (isJson) {
      console.log(JSON.stringify(allReports, null, 2));
    } else {
      for (const r of allReports) {
        console.log(renderAuditReport(r));
        console.log(
          '\n------------------------------------------------------------\n',
        );
      }
    }
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
