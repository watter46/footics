import { extractTargetFile, isModifyToolName } from '../tool-helpers';
import type { AuditContext, Detector, Finding } from '../types';

/**
 * PIPE-01: WORKER_REUSE_OR_NO_KILL
 * 完了済 Worker への send_message 再利用、または TASK_COMPLETE 後の kill 漏れ
 */
export const detectWorkerReuseOrNoKill: Detector = (
  ctx: AuditContext,
): Finding[] => {
  if (ctx.role !== 'planner') return [];

  const findings: Finding[] = [];
  const completedWorkers = new Set<string>();
  const killedWorkers = new Set<string>();
  let reuseStep: number | null = null;

  for (const r of ctx.records) {
    const content = r.content ?? '';
    if (
      r.status === 'ERROR' &&
      (content.includes('Worker reuse prohibited') ||
        content.includes('Worker context limit exceeded'))
    ) {
      reuseStep = r.step_index;
      findings.push({
        id: 'PIPE-01',
        name: 'WORKER_REUSE_OR_NO_KILL',
        severity: 'HIGH',
        sessionId: ctx.sessionId,
        steps: [r.step_index],
        evidence: `Attempted to reuse completed/bloated worker: ${content.slice(0, 120)}`,
        layers: ['planner'],
      });
    }

    if (/TASK_COMPLETE/i.test(content)) {
      const m =
        /(?:source|conversationId|Worker)['":\s]+([a-zA-Z0-9_-]{6,})/i.exec(
          content,
        );
      if (m?.[1]) {
        completedWorkers.add(m[1]);
      } else if (r.source && r.source !== 'USER' && r.source !== 'MODEL') {
        completedWorkers.add(r.source);
      }
    }

    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (
          tc.name === 'manage_subagents' &&
          String(tc.args?.Action ?? '').toLowerCase() === 'kill'
        ) {
          const ids = Array.isArray(tc.args?.ConversationIds)
            ? tc.args.ConversationIds
            : [];
          for (const id of ids) {
            killedWorkers.add(String(id));
          }
        }
      }
    }
  }

  if (reuseStep === null && completedWorkers.size > 0) {
    const unkilled = Array.from(completedWorkers).filter(
      (id) => !killedWorkers.has(id),
    );
    if (unkilled.length > 0 && killedWorkers.size === 0) {
      findings.push({
        id: 'PIPE-01',
        name: 'WORKER_REUSE_OR_NO_KILL',
        severity: 'MED',
        sessionId: ctx.sessionId,
        steps: [ctx.records[ctx.records.length - 1]?.step_index ?? 0],
        evidence: `Completed worker(s) were never terminated via manage_subagents(kill): ${unkilled.slice(0, 3).join(', ')}`,
        layers: ['planner'],
      });
    }
  }

  return findings;
};

/**
 * PIPE-02: POLLING_LOOP
 * manage_subagents(Action: "list") の連続ポーリング
 */
export const detectPollingLoop: Detector = (ctx: AuditContext): Finding[] => {
  if (ctx.role !== 'planner') return [];

  const findings: Finding[] = [];
  let consecutiveList = 0;
  const listSteps: number[] = [];

  for (const r of ctx.records) {
    const content = r.content ?? '';
    if (r.status === 'ERROR' && content.includes('Polling loop blocked')) {
      findings.push({
        id: 'PIPE-02',
        name: 'POLLING_LOOP',
        severity: 'MED',
        sessionId: ctx.sessionId,
        steps: [r.step_index],
        evidence: `Subagent polling loop blocked by guard: ${content.slice(0, 120)}`,
        layers: ['planner'],
      });
      continue;
    }

    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      const isOnlyList =
        r.tool_calls.length === 1 &&
        r.tool_calls[0].name === 'manage_subagents' &&
        String(r.tool_calls[0].args?.Action ?? '').toLowerCase() === 'list';

      if (isOnlyList) {
        consecutiveList++;
        listSteps.push(r.step_index);
      } else {
        if (consecutiveList >= 2) {
          findings.push({
            id: 'PIPE-02',
            name: 'POLLING_LOOP',
            severity: 'MED',
            sessionId: ctx.sessionId,
            steps: [...listSteps],
            evidence: `Polled manage_subagents(list) ${consecutiveList} times consecutively instead of waiting for auto notification`,
            layers: ['planner'],
          });
        }
        consecutiveList = 0;
        listSteps.length = 0;
      }
    }
  }

  if (consecutiveList >= 2) {
    findings.push({
      id: 'PIPE-02',
      name: 'POLLING_LOOP',
      severity: 'MED',
      sessionId: ctx.sessionId,
      steps: [...listSteps],
      evidence: `Polled manage_subagents(list) ${consecutiveList} times consecutively`,
      layers: ['planner'],
    });
  }

  return findings;
};

/**
 * PIPE-03: INTEGRATION_GATE_BYPASS
 * 実装完了 Planner の ai:preflight / ai:commit 漏れ、または生 git commit 試行
 */
export const detectIntegrationGateBypass: Detector = (
  ctx: AuditContext,
): Finding[] => {
  if (ctx.role !== 'planner') return [];

  const findings: Finding[] = [];
  let hasTaskComplete = false;
  let hasIntegrationGate = false;
  let lastStep = 0;

  for (const r of ctx.records) {
    lastStep = r.step_index;
    const content = r.content ?? '';
    if (
      r.status === 'ERROR' &&
      content.includes("Direct 'git commit' is prohibited")
    ) {
      findings.push({
        id: 'PIPE-03',
        name: 'INTEGRATION_GATE_BYPASS',
        severity: 'HIGH',
        sessionId: ctx.sessionId,
        steps: [r.step_index],
        evidence: 'Attempted direct git commit instead of bun run ai:commit',
        layers: ['planner'],
      });
    }

    if (/TASK_COMPLETE/i.test(content)) {
      hasTaskComplete = true;
    }

    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (tc.name === 'run_command') {
          const cmd = String(tc.args?.CommandLine ?? '');
          if (cmd.includes('ai:preflight') || cmd.includes('ai:commit')) {
            hasIntegrationGate = true;
          }
        }
      }
    }
  }

  if (hasTaskComplete && !hasIntegrationGate) {
    findings.push({
      id: 'PIPE-03',
      name: 'INTEGRATION_GATE_BYPASS',
      severity: 'HIGH',
      sessionId: ctx.sessionId,
      steps: [lastStep],
      evidence:
        'Received worker TASK_COMPLETE but finished session without running ai:preflight or ai:commit',
      layers: ['planner'],
    });
  }

  return findings;
};

/**
 * PIPE-04: TASK_VALIDATE_BYPASS
 * tasks/TASK-*.md 作成・編集後の task:validate 未実行、または task-size-guard 遮断
 */
export const detectTaskValidateBypass: Detector = (
  ctx: AuditContext,
): Finding[] => {
  if (ctx.role !== 'planner') return [];

  const findings: Finding[] = [];
  let editedTaskStep: number | null = null;
  let ranValidate = false;

  for (const r of ctx.records) {
    const content = r.content ?? '';
    if (
      r.status === 'ERROR' &&
      (content.includes('Oversized code block detected') ||
        content.includes('Task file line limit exceeded') ||
        content.includes('Phase file limit exceeded') ||
        content.includes('Task file limit exceeded'))
    ) {
      findings.push({
        id: 'PIPE-04',
        name: 'TASK_VALIDATE_BYPASS',
        severity: 'MED',
        sessionId: ctx.sessionId,
        steps: [r.step_index],
        evidence: `Task file violated size/phase contract guard: ${content.slice(0, 120)}`,
        layers: ['planner', 'task-design'],
      });
    }

    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (isModifyToolName(tc.name)) {
          const target = extractTargetFile(tc);
          if (/(?:^|\/)tasks\/TASK-[^/]+\.md$/.test(target)) {
            editedTaskStep = r.step_index;
            ranValidate = false;
          }
        }
        if (tc.name === 'run_command') {
          const cmd = String(tc.args?.CommandLine ?? '');
          if (cmd.includes('task:validate') || cmd.includes('ai:commit')) {
            ranValidate = true;
          }
        }
      }
    }
  }

  if (editedTaskStep !== null && !ranValidate) {
    findings.push({
      id: 'PIPE-04',
      name: 'TASK_VALIDATE_BYPASS',
      severity: 'MED',
      sessionId: ctx.sessionId,
      steps: [editedTaskStep],
      evidence:
        'Modified tasks/TASK-*.md without subsequently running bun run task:validate or ai:commit',
      layers: ['planner'],
    });
  }

  return findings;
};

/**
 * PIPE-05: ABOLISHED_SUBAGENT_ATTEMPT
 * 廃止された scout / reviewer の invoke_subagent または define_subagent 試行
 */
export const detectAbolishedSubagentAttempt: Detector = (
  ctx: AuditContext,
): Finding[] => {
  const findings: Finding[] = [];

  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (tc.name === 'define_subagent') {
          findings.push({
            id: 'PIPE-05',
            name: 'ABOLISHED_SUBAGENT_ATTEMPT',
            severity: 'HIGH',
            sessionId: ctx.sessionId,
            steps: [r.step_index],
            evidence: 'Attempted dynamic define_subagent (prohibited)',
            layers: ['planner'],
          });
        }
        if (tc.name === 'invoke_subagent') {
          const tn = String(tc.args?.TypeName ?? tc.args?.typeName ?? '')
            .replace(/^["']|["']$/g, '')
            .toLowerCase();
          if (tn === 'scout' || tn === 'reviewer') {
            findings.push({
              id: 'PIPE-05',
              name: 'ABOLISHED_SUBAGENT_ATTEMPT',
              severity: 'HIGH',
              sessionId: ctx.sessionId,
              steps: [r.step_index],
              evidence: `Attempted to invoke abolished subagent '${tn}'`,
              layers: ['planner'],
            });
          }
        }
      }
    }
  }

  return findings;
};

/**
 * EFF-01: CONTEXT_BLOAT_ALERT
 * Worker 高ターン化 (>25 / >35) または 1ターン input+cache > 180K / 300K
 */
export const detectContextBloatAlert: Detector = (
  ctx: AuditContext,
): Finding[] => {
  const findings: Finding[] = [];
  const turns = ctx.records.filter((r) => r.type === 'PLANNER_RESPONSE');

  if (ctx.role === 'worker' && turns.length > 25) {
    findings.push({
      id: 'EFF-01',
      name: 'CONTEXT_BLOAT_ALERT',
      severity: turns.length > 35 ? 'HIGH' : 'MED',
      sessionId: ctx.sessionId,
      steps: [turns[turns.length - 1].step_index],
      evidence: `Worker ran for ${turns.length} turns (recommended <= 25, guard limit 35)`,
      layers: ['worker', 'task-design'],
    });
  }

  let maxTokens = 0;
  let maxStep = 0;
  for (const r of turns) {
    const t = (r.input_tokens ?? 0) + (r.cache_read_tokens ?? 0);
    if (t > maxTokens) {
      maxTokens = t;
      maxStep = r.step_index;
    }
  }

  if (maxTokens > 180_000) {
    findings.push({
      id: 'EFF-01',
      name: 'CONTEXT_BLOAT_ALERT',
      severity: maxTokens > 300_000 ? 'HIGH' : 'MED',
      sessionId: ctx.sessionId,
      steps: [maxStep],
      evidence: `Peak context tokens reached ${Math.round(maxTokens / 1000)}K (In+Cache) at step ${maxStep}`,
      layers: [ctx.role === 'worker' ? 'worker' : 'planner'],
    });
  }

  return findings;
};

/**
 * EFF-02: SERIAL_WORKER_DISPATCH
 * 複数 Worker を並列ではなく単発直列で 3 回以上起動した兆候
 */
export const detectSerialWorkerDispatch: Detector = (
  ctx: AuditContext,
): Finding[] => {
  if (ctx.role !== 'planner') return [];

  const singleInvokeSteps: number[] = [];
  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      const invokes = r.tool_calls.filter(
        (tc) => tc.name === 'invoke_subagent',
      );
      if (invokes.length === 1) {
        singleInvokeSteps.push(r.step_index);
      } else if (invokes.length > 1) {
        return [];
      }
    }
  }

  if (singleInvokeSteps.length >= 3) {
    return [
      {
        id: 'EFF-02',
        name: 'SERIAL_WORKER_DISPATCH',
        severity: 'LOW',
        sessionId: ctx.sessionId,
        steps: singleInvokeSteps,
        evidence: `Dispatched ${singleInvokeSteps.length} workers one-by-one serially; check if non-overlapping phases could run in parallel`,
        layers: ['planner'],
      },
    ];
  }

  return [];
};

/**
 * EFF-03: PROMPT_BLOAT
 * invoke_subagent Prompt の冗長貼り付け (>1500 chars) または巨大ツール出力 (>6000 chars)
 */
export const detectPromptBloat: Detector = (ctx: AuditContext): Finding[] => {
  const findings: Finding[] = [];

  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (tc.name === 'invoke_subagent') {
          const prompt = String(tc.args?.Prompt ?? tc.args?.prompt ?? '');
          if (prompt.length > 1500) {
            findings.push({
              id: 'EFF-03',
              name: 'PROMPT_BLOAT',
              severity: 'LOW',
              sessionId: ctx.sessionId,
              steps: [r.step_index],
              evidence: `Subagent Prompt length ${prompt.length} chars (>1500); pass only pointer to tasks/TASK-*.md`,
              layers: ['planner'],
            });
          }
        }
      }
    }
  }

  return findings;
};

export const PIPELINE_DETECTORS: Detector[] = [
  detectWorkerReuseOrNoKill,
  detectPollingLoop,
  detectIntegrationGateBypass,
  detectTaskValidateBypass,
  detectAbolishedSubagentAttempt,
  detectContextBloatAlert,
  detectSerialWorkerDispatch,
  detectPromptBloat,
];
