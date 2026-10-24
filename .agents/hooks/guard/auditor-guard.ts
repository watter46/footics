import { detectAgentRole } from './agent-access-guard';
import { parseExecutable, splitCommands, tokenize } from './parser';

export interface GuardDecision {
  decision: 'allow' | 'deny';
  reason?: string;
}

export const AUDITOR_ALLOWED_EXECUTABLES: readonly string[] = [
  'bun',
  'rtk',
  'git',
  'fd',
  'eza',
  'ast-grep',
  'jq',
  'rg',
];

const RAW_TRANSCRIPT_REGEX =
  /transcript[^\s'"]*\.jsonl|\.system_generated\/logs/i;

export function isRawTranscriptTarget(s: string): boolean {
  if (!s || typeof s !== 'string') return false;
  return RAW_TRANSCRIPT_REGEX.test(s);
}

const ALLOWED_BUN_SCRIPTS = new Set([
  'ai:audit',
  'ai:report',
  'ai:find',
  'ai:outline',
  'task:validate',
  '.agents/scripts/audit-session.ts',
  '.agents/scripts/session-report.ts',
  '.agents/scripts/validate-task.ts',
  'scripts/map/find-symbol.ts',
  'scripts/ast/extract-types.ts',
]);

const ALLOWED_GIT_SUBCOMMANDS = new Set([
  'show',
  'log',
  'diff',
  'status',
  'ls-files',
  'blame',
]);

/**
 * Auditor ロール専用の実行・読込ガード。
 * 1. transcript*.jsonl への直接アクセス（read_file / cat / jq 等）を遮断
 * 2. 実行可能コマンドを監査・分析用ツールに限定
 * 3. 読み取り専用（git commit や build / test 系コマンドの遮断）
 */
export function checkAuditorGuard(payload: any): GuardDecision | null {
  const role = detectAgentRole(payload?.transcriptPath);
  if (role !== 'auditor') {
    return null;
  }

  const toolName = payload?.toolCall?.name;

  // 0. サブエージェント起動の遮断（Auditor は単独自律実行のためサブエージェント起動を禁止）
  if (toolName === 'invoke_subagent' || toolName === 'define_subagent') {
    return {
      decision: 'deny',
      reason: `[GUARD] Access Denied: Auditor operates as a standalone direct audit agent and is prohibited from spawning subagents ('${toolName}'). Execute 'bun run ai:audit' and analyze findings directly within this context.`,
    };
  }

  // 1. read_file / view_file に対する transcript 直接読込の遮断
  if (toolName === 'read_file' || toolName === 'view_file') {
    const rawTarget =
      payload.toolCall?.args?.Path ||
      payload.toolCall?.args?.AbsolutePath ||
      payload.toolCall?.args?.TargetFile ||
      '';
    const target = String(rawTarget).trim().replace(/^"|"$/g, '');

    if (isRawTranscriptTarget(target)) {
      return {
        decision: 'deny',
        reason: `[GUARD] Access Denied: Auditor is prohibited from direct transcript reads ('${target}'). Reason: Direct transcript reads cause extreme token explosion. Action: Use 'bun run ai:audit <id>' or 'bun run ai:audit --step-detail <id> <start>:<end>' to extract structured summaries.`,
      };
    }
    return null;
  }

  // 2. run_command に対する実行制御
  if (toolName === 'run_command' || payload?.CommandLine || payload?.command) {
    const cmdLine = String(
      payload?.toolCall?.args?.CommandLine ||
        payload?.toolCall?.args?.command ||
        payload?.CommandLine ||
        payload?.command ||
        '',
    ).trim();

    if (!cmdLine) return null;

    // 生 transcript への cat/jq などの直接参照を遮断
    if (isRawTranscriptTarget(cmdLine)) {
      return {
        decision: 'deny',
        reason: `[GUARD] Access Denied: Auditor is prohibited from accessing raw transcript files directly in commands ('${cmdLine}'). Use 'bun run ai:audit' commands instead.`,
      };
    }

    const subCommands = splitCommands(cmdLine);

    for (const subCmd of subCommands) {
      const tokens = tokenize(subCmd);
      if (tokens.length === 0) continue;

      const parsed = parseExecutable(tokens);
      if (!parsed.executable) continue;

      if (!AUDITOR_ALLOWED_EXECUTABLES.includes(parsed.executable)) {
        return {
          decision: 'deny',
          reason: `[GUARD] Access Denied: Auditor command execution is restricted to allowed analysis tools (${AUDITOR_ALLOWED_EXECUTABLES.join(', ')}). Executable '${parsed.executable}' is not permitted.`,
        };
      }

      // bun のスクリプト制限
      if (parsed.executable === 'bun') {
        if (parsed.args[0] === 'test') {
          const testTargets = parsed.args
            .slice(1)
            .filter((a) => !a.startsWith('-'));
          const isAllowedAgentTest =
            testTargets.length > 0 &&
            testTargets.every(
              (t) =>
                t === '.agents' ||
                t === './.agents' ||
                t.startsWith('.agents/') ||
                t.startsWith('./.agents/'),
            );
          if (!isAllowedAgentTest) {
            return {
              decision: 'deny',
              reason: `[GUARD] Access Denied: Auditor may only run 'bun test' scoped to './.agents'.`,
            };
          }
          continue;
        }

        const isRun = parsed.args[0] === 'run';
        const targetScript = isRun ? parsed.args[1] : parsed.args[0];

        const isAllowedScript =
          targetScript && ALLOWED_BUN_SCRIPTS.has(targetScript);

        if (!isAllowedScript) {
          return {
            decision: 'deny',
            reason: `[GUARD] Access Denied: Auditor may only execute authorized audit scripts with bun (ai:audit, ai:report, ai:find, ai:outline, task:validate, or bun test ./.agents). '${targetScript ?? 'bun'}' is not allowed.`,
          };
        }
      }

      // git のサブコマンド制限（読み取り専用）
      if (parsed.executable === 'git') {
        const sub = parsed.args.find((a) => !a.startsWith('-'));
        if (!sub || !ALLOWED_GIT_SUBCOMMANDS.has(sub)) {
          return {
            decision: 'deny',
            reason: `[GUARD] Access Denied: Auditor can only run read-only git commands (${Array.from(ALLOWED_GIT_SUBCOMMANDS).join(', ')}). Subcommand '${sub ?? 'git'}' is prohibited.`,
          };
        }
      }
    }
  }

  return null;
}
