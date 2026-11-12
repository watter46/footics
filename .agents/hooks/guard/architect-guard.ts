import { detectAgentRole } from './agent-access-guard';
import { isRawTranscriptTarget } from './auditor-guard';
import { parseExecutable, splitCommands, tokenize } from './parser';
import { cleanString } from './transcript-calls';

export interface GuardDecision {
  decision: 'allow' | 'deny';
  reason?: string;
}

export const ARCHITECT_ALLOWED_EXECUTABLES: readonly string[] = [
  'bun',
  'rtk',
  'git',
  'fd',
  'eza',
  'ast-grep',
  'jq',
  'rg',
];

const ALLOWED_BUN_SCRIPTS = new Set([
  'ai:outline',
  'ai:find',
  'ai:report',
  'ai:audit',
  'task:validate',
  '.agents/scripts/outline.ts',
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
 * Architect ロール専用の実行・読込・サブエージェントガード。
 * 1. サブエージェント起動は Scout（flash_lite による探索・型抽出）のみ許可し、Worker/Reviewer等を遮断
 * 2. transcript*.jsonl への直接アクセス（read_file / cat / jq 等）を遮断
 * 3. 実行可能コマンドを探索・設計分析・ルール検証用ツールに限定
 * 4. 読み取り専用（git commit や build / test 系コマンドの遮断）
 */
export function checkArchitectGuard(payload: any): GuardDecision | null {
  const role = detectAgentRole(payload?.transcriptPath);
  if (role !== 'architect') {
    return null;
  }

  const toolName = payload?.toolCall?.name;

  // 1. サブエージェント起動の制御
  // Scout / Reviewer 廃止に伴い、Architect からのサブエージェント起動は全面遮断（ai:outline や read_file を直接使用する）。
  if (toolName === 'invoke_subagent') {
    const rawTypeName =
      payload?.toolCall?.args?.TypeName ||
      payload?.toolCall?.args?.typeName ||
      '';
    return {
      decision: 'deny',
      reason: `[GUARD] Access Denied: Architect is prohibited from spawning subagents ('${rawTypeName || 'unknown'}'). Use 'bun run ai:outline <files>', 'rg -l', and 'read_file' directly.`,
    };
  }

  if (toolName === 'define_subagent') {
    return {
      decision: 'deny',
      reason: `[GUARD] Access Denied: Dynamic subagent definition with 'define_subagent' is prohibited.`,
    };
  }

  // 2. read_file / view_file に対する transcript 直接読込の遮断
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
        reason: `[GUARD] Access Denied: Architect is prohibited from direct transcript reads ('${target}'). Direct transcript reads cause extreme token explosion.`,
      };
    }
    return null;
  }

  // 3. run_command に対する実行制御
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
        reason: `[GUARD] Access Denied: Architect is prohibited from accessing raw transcript files directly in commands ('${cmdLine}').`,
      };
    }

    const subCommands = splitCommands(cmdLine);

    for (const subCmd of subCommands) {
      const tokens = tokenize(subCmd);
      if (tokens.length === 0) continue;

      const parsed = parseExecutable(tokens);
      if (!parsed.executable) continue;

      if (!ARCHITECT_ALLOWED_EXECUTABLES.includes(parsed.executable)) {
        return {
          decision: 'deny',
          reason: `[GUARD] Access Denied: Architect command execution is restricted to allowed analysis tools (${ARCHITECT_ALLOWED_EXECUTABLES.join(', ')}). Executable '${parsed.executable}' is not permitted.`,
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
              reason: `[GUARD] Access Denied: Architect may only run 'bun test' scoped to './.agents'.`,
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
            reason: `[GUARD] Access Denied: Architect may only execute authorized scripts with bun (${Array.from(ALLOWED_BUN_SCRIPTS).join(', ')}, or bun test ./.agents). '${targetScript ?? 'bun'}' is not allowed.`,
          };
        }
      }

      // git のサブコマンド制限（読み取り専用）
      if (parsed.executable === 'git') {
        const sub = parsed.args.find((a) => !a.startsWith('-'));
        if (!sub || !ALLOWED_GIT_SUBCOMMANDS.has(sub)) {
          return {
            decision: 'deny',
            reason: `[GUARD] Access Denied: Architect can only run read-only git commands (${Array.from(ALLOWED_GIT_SUBCOMMANDS).join(', ')}). Subcommand '${sub ?? 'git'}' is prohibited.`,
          };
        }
      }
    }
  }

  return null;
}
