import {
  extractTargetFile,
  isModifyToolName,
  isReadToolName,
} from '../tool-helpers';
import type { AuditContext, Detector, Finding } from '../types';

/**
 * EXP-01: OUTLINE_BYPASS
 * Planner が ai:peek / ai:impact / ast-grep / rg を使わずに 3 件以上のソースファイルを直接読込
 * （※旧 Scout 時代ログで invoke_subagent(scout) がある場合は対象外）
 */
export const detectOutlineBypass: Detector = (ctx: AuditContext): Finding[] => {
  if (ctx.role !== 'planner') return [];

  let usedDiscoveryTool = false;
  let scoutInvoked = false;
  const readSourceFiles = new Set<string>();
  const steps: number[] = [];

  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (
          tc.name === 'invoke_subagent' &&
          (String(tc.args?.TypeName).toLowerCase() === 'scout' ||
            String(tc.args?.Role).toLowerCase().includes('scout'))
        ) {
          scoutInvoked = true;
        }

        if (tc.name === 'run_command') {
          const cmd = String(tc.args?.CommandLine ?? '');
          if (
            cmd.includes('ai:peek') ||
            cmd.includes('ai:impact') ||
            cmd.includes('ast-grep') ||
            /\b(?:rg|rtk\s+grep)\b/.test(cmd)
          ) {
            usedDiscoveryTool = true;
          }
        }

        if (isReadToolName(tc.name)) {
          const file = extractTargetFile(tc);
          if (
            file.startsWith('src/') ||
            file.startsWith('extension/') ||
            /\/(?:src|extension)\//.test(file)
          ) {
            readSourceFiles.add(file);
            steps.push(r.step_index);
          }
        }
      }
    }
  }

  if (!scoutInvoked && !usedDiscoveryTool && readSourceFiles.size >= 3) {
    return [
      {
        id: 'EXP-01',
        name: 'OUTLINE_BYPASS',
        severity: 'HIGH',
        sessionId: ctx.sessionId,
        steps: Array.from(new Set(steps)),
        evidence: `Planner read ${readSourceFiles.size} source files directly without using ai:peek / ai:impact / rg: ${Array.from(readSourceFiles).slice(0, 5).join(', ')}`,
        layers: ['planner', 'rule'],
      },
    ];
  }

  return [];
};

/**
 * EXP-02: BAD_FIRST_MOVE
 * 初動 3 ターンで ai:peek / ai:impact / ast-grep / rg -l / tasks/TASK-*.md / notes/*.md を使わず漫然探索
 */
export const detectBadFirstMove: Detector = (ctx: AuditContext): Finding[] => {
  if (ctx.role !== 'planner') return [];

  const firstTurns = ctx.records
    .filter((r) => r.type === 'PLANNER_RESPONSE')
    .slice(0, 3);

  if (firstTurns.length === 0) return [];

  let hasGoodFirstMove = false;
  let hasRawExploration = false;
  const steps: number[] = [];

  for (const r of firstTurns) {
    for (const tc of r.tool_calls ?? []) {
      const cmd = String(tc.args?.CommandLine ?? '').trim();
      const file = extractTargetFile(tc);

      if (
        /(?:^|\/)tasks\/TASK-[^/]+\.md$/.test(file) ||
        /(?:^|\/)notes\/[^/]+\.md$/.test(file) ||
        cmd.includes('ai:peek') ||
        cmd.includes('ai:impact') ||
        cmd.includes('ast-grep') ||
        /\brg\s+(?:-[a-zA-Z]*[lc]|--files-with-matches|--count)\b/.test(cmd)
      ) {
        hasGoodFirstMove = true;
      }

      if (
        (isReadToolName(tc.name) &&
          !/(?:^|\/)tasks\/TASK-[^/]+\.md$/.test(file) &&
          !/(?:^|\/)notes\/[^/]+\.md$/.test(file)) ||
        (/^(?:grep|rg|find|ls)\b/.test(cmd) &&
          !/^rg\s+(?:-[a-zA-Z]*[lc]|--files-with-matches|--count)\b/.test(cmd))
      ) {
        hasRawExploration = true;
        steps.push(r.step_index);
      }
    }
  }

  if (!hasGoodFirstMove && hasRawExploration) {
    return [
      {
        id: 'EXP-02',
        name: 'BAD_FIRST_MOVE',
        severity: 'MED',
        sessionId: ctx.sessionId,
        steps,
        evidence:
          'Initial 3 turns used raw file exploration without ai:peek, ai:impact, ast-grep, rg -l, notes, or TASK file',
        layers: ['planner', 'rule'],
      },
    ];
  }

  return [];
};

/**
 * EXP-03: EXPLORE_SHARE
 * 初回編集またはサブエージェント呼出までの探索ターン数が全体の 30% を超過
 */
export const detectExploreShare: Detector = (ctx: AuditContext): Finding[] => {
  if (ctx.role !== 'planner') return [];

  const plannerTurns = ctx.records.filter((r) => r.type === 'PLANNER_RESPONSE');
  if (plannerTurns.length < 5) return [];

  let firstActionTurn = -1;

  for (let i = 0; i < plannerTurns.length; i++) {
    const r = plannerTurns[i];
    const hasAction = r.tool_calls?.some(
      (tc) => tc.name === 'invoke_subagent' || isModifyToolName(tc.name),
    );
    if (hasAction) {
      firstActionTurn = i;
      break;
    }
  }

  const explorationTurns =
    firstActionTurn === -1 ? plannerTurns.length : firstActionTurn;
  const ratio = explorationTurns / plannerTurns.length;

  if (ratio > 0.3 && explorationTurns >= 3) {
    return [
      {
        id: 'EXP-03',
        name: 'EXPLORE_SHARE',
        severity: 'MED',
        sessionId: ctx.sessionId,
        steps: [
          plannerTurns[0].step_index,
          plannerTurns[Math.min(explorationTurns - 1, plannerTurns.length - 1)]
            .step_index,
        ],
        evidence: `Exploration phase took ${explorationTurns} turns (${Math.round(ratio * 100)}% of total ${plannerTurns.length} turns) before first action`,
        layers: ['planner'],
      },
    ];
  }

  return [];
};

/**
 * EXP-04: SERIAL_INDEPENDENT
 * 3 ステップ以上連続して単独でファイル読込
 */
export const detectSerialIndependent: Detector = (
  ctx: AuditContext,
): Finding[] => {
  const findings: Finding[] = [];
  let steps: number[] = [];
  let consecutive = 0;
  let prevFile = '';

  const flush = () => {
    if (consecutive >= 3) {
      findings.push({
        id: 'EXP-04',
        name: 'SERIAL_INDEPENDENT',
        severity: 'LOW',
        sessionId: ctx.sessionId,
        steps: [...steps],
        evidence: `${consecutive} consecutive single-file read calls issued without parallelizing independent reads`,
        layers: ['planner', 'worker'],
      });
    }
    consecutive = 0;
    prevFile = '';
    steps = [];
  };

  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE') {
      const tc = r.tool_calls;
      if (tc && tc.length === 1 && isReadToolName(tc[0].name)) {
        const file = extractTargetFile(tc[0]);
        if (file && file !== prevFile) {
          consecutive++;
          steps.push(r.step_index);
          prevFile = file;
          continue;
        }
      }
      flush();
    }
  }
  flush();

  return findings;
};

/**
 * EXP-05: LINECOUNT_PUZZLE
 * wc -l が読込遮断の直後や読込直前に実行された
 */
export const detectLinecountPuzzle: Detector = (
  ctx: AuditContext,
): Finding[] => {
  const findings: Finding[] = [];

  for (let i = 0; i < ctx.records.length; i++) {
    const r = ctx.records[i];
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (tc.name === 'run_command') {
          const cmd = String(tc.args?.CommandLine ?? '');
          if (/\bwc\s+-l\b/.test(cmd)) {
            const prev = ctx.records[i - 1];
            const next = ctx.records[i + 1];
            const prevWasDenial =
              prev?.content?.includes('slicing loop') ||
              prev?.content?.includes('400') ||
              prev?.content?.includes('denied');
            const nextIsRead = next?.tool_calls?.some((x) =>
              isReadToolName(x.name),
            );

            if (prevWasDenial || nextIsRead) {
              findings.push({
                id: 'EXP-05',
                name: 'LINECOUNT_PUZZLE',
                severity: 'MED',
                sessionId: ctx.sessionId,
                steps: [r.step_index],
                evidence: `Executed 'wc -l' in response to or preparation for file reading: ${cmd}`,
                layers: ['planner', 'rule'],
              });
            }
          }
        }
      }
    }
  }

  return findings;
};

/**
 * EXP-06: GUESSED_PATH
 * 存在しないパスへの推測アクセスで遮断・エラー
 */
export const detectGuessedPath: Detector = (ctx: AuditContext): Finding[] => {
  const findings: Finding[] = [];

  for (const r of ctx.records) {
    const content = r.content ?? '';
    const isGuessError =
      r.status === 'ERROR' &&
      (content.includes('File not found') ||
        content.includes('Guessing file paths') ||
        content.includes('No such file or directory'));

    if (isGuessError) {
      findings.push({
        id: 'EXP-06',
        name: 'GUESSED_PATH',
        severity: 'LOW',
        sessionId: ctx.sessionId,
        steps: [r.step_index],
        evidence: `Encountered file-guessing / non-existent path error: ${content.slice(0, 120)}`,
        layers: ['planner', 'worker'],
      });
    }
  }

  return findings;
};

/**
 * EXP-07: SCOPE_VIOLATION
 * 引数なし・ディレクトリ指定の ai:check または生 vitest/biome/tsc/bun test
 */
export const detectScopeViolation: Detector = (
  ctx: AuditContext,
): Finding[] => {
  const findings: Finding[] = [];

  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (tc.name === 'run_command') {
          const cmd = String(tc.args?.CommandLine ?? '').trim();

          // 1. ai:check 無引数またはディレクトリ指定（複数引数も考慮）
          const checkMatch =
            /^(?:bun\s+run\s+|pnpm\s+run\s+)?ai:check(?:\s+(.+))?$/.exec(cmd);
          if (checkMatch) {
            const rawArgs = (checkMatch[1] ?? '').trim();
            const argList = rawArgs
              .split(/\s+/)
              .filter((a) => a && !a.startsWith('-'));
            const hasDirTarget =
              argList.length === 0 ||
              argList.some(
                (a) =>
                  a === '.' ||
                  a === './' ||
                  a.endsWith('/') ||
                  a === 'src' ||
                  a === 'extension' ||
                  a === 'tests',
              );
            if (hasDirTarget) {
              findings.push({
                id: 'EXP-07',
                name: 'SCOPE_VIOLATION',
                severity: 'HIGH',
                sessionId: ctx.sessionId,
                steps: [r.step_index],
                evidence: `Executed unscoped or directory-level ai:check: '${cmd}'`,
                layers: ['planner', 'worker'],
              });
              continue;
            }
          }

          // 2. 生 vitest, biome check, tsc, または Worker の生 bun test/lint/typecheck 直接実行
          const isRawTool =
            /^(?:npx\s+|bunx\s+)?(?:vitest(?:\s+run)?|biome\s+check|tsc(?:\s+--noEmit)?)\b/.test(
              cmd,
            );
          const isWorkerRawBun =
            ctx.role === 'worker' &&
            /^(?:bun\s+test\b|bun\s+run\s+(?:test|lint|typecheck(?::full)?)\b)/.test(
              cmd,
            ) &&
            !cmd.includes('.agents');

          if (
            (isRawTool || isWorkerRawBun) &&
            !cmd.startsWith('rtk') &&
            !cmd.includes('ai:check') &&
            !cmd.includes('ai:preflight') &&
            !cmd.includes('ai:commit')
          ) {
            findings.push({
              id: 'EXP-07',
              name: 'SCOPE_VIOLATION',
              severity: 'HIGH',
              sessionId: ctx.sessionId,
              steps: [r.step_index],
              evidence: `Directly executed verification tool without rtk or scope: '${cmd}'`,
              layers: ['planner', 'worker'],
            });
          }
        }
      }
    }
  }

  return findings;
};

/**
 * EXP-08: REPEAT_DENIAL
 * 同一ファイル・同一理由で 2 回以上連続して遮断
 */
export const detectRepeatDenial: Detector = (ctx: AuditContext): Finding[] => {
  const findings: Finding[] = [];
  let prevReason = '';
  let prevStep = -1;

  for (const r of ctx.records) {
    const content = r.content ?? '';
    const isDenial =
      r.status === 'ERROR' &&
      (content.includes('tool call denied by pre-tool hook') ||
        content.includes('[GUARD]'));

    if (isDenial) {
      const reasonKey = content
        .replace(/^[\s\S]*?(\[GUARD\]|tool call denied)/i, '$1')
        .slice(0, 80);

      if (prevReason && reasonKey === prevReason) {
        findings.push({
          id: 'EXP-08',
          name: 'REPEAT_DENIAL',
          severity: 'HIGH',
          sessionId: ctx.sessionId,
          steps: [prevStep, r.step_index],
          evidence: `Repeated hook denial on identical condition: ${reasonKey}`,
          layers: ['agent-def', 'hook'],
        });
      }
      prevReason = reasonKey;
      prevStep = r.step_index;
    } else if (r.status === 'DONE') {
      prevReason = '';
    }
  }

  return findings;
};

/**
 * EXP-09: ROLE_VIOLATION
 * 役割ごとの禁止行為（Plannerのコード編集、Workerの.agents編集、Architect/Auditor境界違反など）
 */
export const detectRoleViolation: Detector = (ctx: AuditContext): Finding[] => {
  const findings: Finding[] = [];

  const roleViolationPatterns = [
    /Planner is prohibited from editing source code/i,
    /Scout is a read-only reconnaissance agent/i,
    /Reviewer is prohibited from editing source code/i,
    /Worker is prohibited from modifying agent definitions/i,
    /Worker is prohibited from modifying 'package\.json'/i,
    /Worker can only modify files in/i,
    /Auditor is a read-only audit agent/i,
    /Auditor is prohibited from/i,
    /Auditor operates as a standalone direct audit agent/i,
    /Architect is prohibited from/i,
  ];

  for (const r of ctx.records) {
    const content = r.content ?? '';
    if (r.status === 'ERROR' || content.includes('[GUARD]')) {
      for (const pat of roleViolationPatterns) {
        if (pat.test(content)) {
          findings.push({
            id: 'EXP-09',
            name: 'ROLE_VIOLATION',
            severity: 'HIGH',
            sessionId: ctx.sessionId,
            steps: [r.step_index],
            evidence: `Violated agent role boundaries: ${content.slice(0, 140)}`,
            layers: ['agent-def', 'hook'],
          });
          break;
        }
      }
    }
  }

  return findings;
};

/**
 * EXP-10: BLIND_REDO
 * 同一コマンドの連続再実行
 */
export const detectBlindRedo: Detector = (ctx: AuditContext): Finding[] => {
  const findings: Finding[] = [];
  let prevCmd = '';
  let prevStep = -1;

  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (tc.name === 'run_command') {
          const cmd = String(tc.args?.CommandLine ?? '').trim();
          if (cmd && cmd === prevCmd) {
            findings.push({
              id: 'EXP-10',
              name: 'BLIND_REDO',
              severity: 'MED',
              sessionId: ctx.sessionId,
              steps: [prevStep, r.step_index],
              evidence: `Consecutively repeated identical command: ${cmd}`,
              layers: ['worker', 'script'],
            });
          }
          prevCmd = cmd;
          prevStep = r.step_index;
        }
      }
    }
  }

  return findings;
};

export const EXPLORATION_DETECTORS: Detector[] = [
  detectOutlineBypass,
  detectBadFirstMove,
  detectExploreShare,
  detectSerialIndependent,
  detectLinecountPuzzle,
  detectGuessedPath,
  detectScopeViolation,
  detectRepeatDenial,
  detectRoleViolation,
  detectBlindRedo,
];
