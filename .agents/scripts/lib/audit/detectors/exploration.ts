import type { AuditContext, Detector, Finding } from '../types';

function extractTargetFile(tc: {
  name: string;
  args?: Record<string, unknown>;
}): string {
  const raw =
    tc.args?.AbsolutePath ??
    tc.args?.Path ??
    tc.args?.TargetFile ??
    tc.args?.file ??
    '';
  return String(raw).trim().replace(/^"|"$/g, '');
}

/**
 * EXP-01: SCOUT_BYPASS
 * Planner が Scout を起動せずに 3 以上のソースコードファイルを直接読込
 */
export const detectScoutBypass: Detector = (ctx: AuditContext): Finding[] => {
  if (ctx.role !== 'planner') return [];

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

        if (tc.name === 'view_file' || tc.name === 'read_file') {
          const file = extractTargetFile(tc);
          if (file.startsWith('src/') || file.startsWith('extension/')) {
            readSourceFiles.add(file);
            steps.push(r.step_index);
          }
        }
      }
    }
  }

  if (!scoutInvoked && readSourceFiles.size >= 3) {
    return [
      {
        id: 'EXP-01',
        name: 'SCOUT_BYPASS',
        severity: 'HIGH',
        sessionId: ctx.sessionId,
        steps: Array.from(new Set(steps)),
        evidence: `Planner read ${readSourceFiles.size} source files directly without invoking Scout: ${Array.from(readSourceFiles).slice(0, 5).join(', ')}`,
        layers: ['planner', 'rule'],
      },
    ];
  }

  return [];
};

/**
 * EXP-02: BAD_FIRST_MOVE
 * 初動 3 ターンで repo_summary.txt / ai:find / ai:outline を使わず漫然探索
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
      const cmd = String(tc.args?.CommandLine ?? '');
      const file = extractTargetFile(tc);

      if (
        file.includes('repo_summary.txt') ||
        cmd.includes('repo_summary.txt') ||
        cmd.includes('ai:find') ||
        cmd.includes('ai:outline')
      ) {
        hasGoodFirstMove = true;
      }

      if (
        tc.name === 'view_file' ||
        tc.name === 'read_file' ||
        /^(?:grep|rg|find|ls)\b/.test(cmd.trim())
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
          'Initial 3 turns used raw file exploration without repo_summary.txt, ai:find, or ai:outline',
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
      (tc) =>
        tc.name === 'invoke_subagent' ||
        tc.name === 'write_file' ||
        tc.name === 'edit_file' ||
        tc.name === 'write_to_file' ||
        tc.name === 'replace_file_content',
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
  const steps: number[] = [];
  let consecutive = 0;
  let prevFile = '';

  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE') {
      const tc = r.tool_calls;
      if (
        tc &&
        tc.length === 1 &&
        (tc[0].name === 'view_file' || tc[0].name === 'read_file')
      ) {
        const file = extractTargetFile(tc[0]);
        if (file && file !== prevFile) {
          consecutive++;
          steps.push(r.step_index);
          prevFile = file;
          continue;
        }
      }
      if (consecutive >= 3) break;
      consecutive = 0;
      prevFile = '';
      steps.length = 0;
    }
  }

  if (consecutive >= 3) {
    return [
      {
        id: 'EXP-04',
        name: 'SERIAL_INDEPENDENT',
        severity: 'LOW',
        sessionId: ctx.sessionId,
        steps,
        evidence: `${consecutive} consecutive single-file read calls issued without parallelizing independent reads`,
        layers: ['planner', 'worker'],
      },
    ];
  }

  return [];
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
            // 直前直後をチェック
            const prev = ctx.records[i - 1];
            const next = ctx.records[i + 1];
            const prevWasDenial =
              prev?.content?.includes('slicing loop') ||
              prev?.content?.includes('400') ||
              prev?.content?.includes('denied');
            const nextIsRead = next?.tool_calls?.some(
              (x) => x.name === 'view_file' || x.name === 'read_file',
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
 * 引数なし・ディレクトリ指定の ai:check または生 vitest/biome/tsc
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

          // 1. ai:check 無引数またはディレクトリ
          if (
            /^(?:bun\s+run\s+|pnpm\s+run\s+)?ai:check(?:\s+([^\s]+))?$/.test(
              cmd,
            )
          ) {
            const m = /ai:check(?:\s+([^\s]+))?$/.exec(cmd);
            const arg = m?.[1];
            if (
              !arg ||
              arg.endsWith('/') ||
              arg === 'src' ||
              arg === 'extension'
            ) {
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

          // 2. 生 vitest, biome check, tsc 直接実行
          if (
            /^(?:npx\s+|bunx\s+)?(?:vitest(?:\s+run)?|biome\s+check|tsc(?:\s+--noEmit)?)\b/.test(
              cmd,
            ) &&
            !cmd.startsWith('rtk') &&
            !cmd.includes('ai:check') &&
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
 * 役割ごとの禁止行為（Plannerのコード編集、Scoutの書込など）
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
    /Auditor operates as a standalone direct audit agent/i,
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
  detectScoutBypass,
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
