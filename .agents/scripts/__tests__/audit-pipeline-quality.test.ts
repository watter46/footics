import { describe, expect, test } from 'bun:test';
import {
  detectAbolishedSubagentAttempt,
  detectContextBloatAlert,
  detectIntegrationGateBypass,
  detectPollingLoop,
  detectPromptBloat,
  detectSerialWorkerDispatch,
  detectTaskValidateBypass,
  detectWorkerReuseOrNoKill,
  PIPELINE_DETECTORS,
} from '../lib/audit/detectors/pipeline';
import {
  detectArchPatternViolation,
  detectQualityOrMockBypass,
  QUALITY_DETECTORS,
} from '../lib/audit/detectors/quality';
import type { AuditContext } from '../lib/audit/types';

describe('pipeline & efficiency detectors (PIPE-01..05, EFF-01..03)', () => {
  test('PIPE-01 detects worker reuse error and missing kill after TASK_COMPLETE', () => {
    const reuseCtx: AuditContext = {
      sessionId: 'pipe01-reuse',
      role: 'planner',
      childIds: [],
      records: [
        {
          step_index: 5,
          type: 'GENERIC',
          status: 'ERROR',
          content: '[GUARD] Worker reuse prohibited for worker-123',
        },
      ],
    };
    const reuseFindings = detectWorkerReuseOrNoKill(reuseCtx);
    expect(reuseFindings.length).toBe(1);
    expect(reuseFindings[0].id).toBe('PIPE-01');
    expect(reuseFindings[0].severity).toBe('HIGH');

    const noKillCtx: AuditContext = {
      sessionId: 'pipe01-nokill',
      role: 'planner',
      childIds: [],
      records: [
        {
          step_index: 4,
          type: 'SYSTEM_MESSAGE',
          source: 'worker-abc123',
          content: '{"status":"TASK_COMPLETE"}',
        },
        {
          step_index: 5,
          type: 'PLANNER_RESPONSE',
          content: 'done',
        },
      ],
    };
    const noKillFindings = detectWorkerReuseOrNoKill(noKillCtx);
    expect(noKillFindings.length).toBe(1);
    expect(noKillFindings[0].severity).toBe('MED');

    const killedCtx: AuditContext = {
      sessionId: 'pipe01-killed',
      role: 'planner',
      childIds: [],
      records: [
        {
          step_index: 4,
          type: 'SYSTEM_MESSAGE',
          source: 'worker-abc123',
          content: '{"status":"TASK_COMPLETE"}',
        },
        {
          step_index: 5,
          type: 'PLANNER_RESPONSE',
          tool_calls: [
            {
              name: 'manage_subagents',
              args: { Action: 'kill', ConversationIds: ['worker-abc123'] },
            },
          ],
        },
      ],
    };
    expect(detectWorkerReuseOrNoKill(killedCtx).length).toBe(0);
  });

  test('PIPE-02 detects manage_subagents(list) polling loop', () => {
    const ctx: AuditContext = {
      sessionId: 'pipe02',
      role: 'planner',
      childIds: [],
      records: [
        {
          step_index: 1,
          type: 'PLANNER_RESPONSE',
          tool_calls: [{ name: 'manage_subagents', args: { Action: 'list' } }],
        },
        {
          step_index: 2,
          type: 'PLANNER_RESPONSE',
          tool_calls: [{ name: 'manage_subagents', args: { Action: 'list' } }],
        },
      ],
    };
    const findings = detectPollingLoop(ctx);
    expect(findings.length).toBe(1);
    expect(findings[0].id).toBe('PIPE-02');
    expect(findings[0].steps).toEqual([1, 2]);
  });

  test('PIPE-03 detects missing ai:preflight/ai:commit after TASK_COMPLETE or direct git commit denial', () => {
    const ctx: AuditContext = {
      sessionId: 'pipe03',
      role: 'planner',
      childIds: [],
      records: [
        {
          step_index: 1,
          type: 'SYSTEM_MESSAGE',
          content: 'TASK_COMPLETE',
        },
        {
          step_index: 2,
          type: 'GENERIC',
          status: 'ERROR',
          content: "Direct 'git commit' is prohibited. Use ai:commit.",
        },
      ],
    };
    const findings = detectIntegrationGateBypass(ctx);
    expect(findings.length).toBe(2);
    expect(findings.every((f) => f.id === 'PIPE-03')).toBe(true);
  });

  test('PIPE-04 detects tasks/TASK-*.md edit without task:validate', () => {
    const ctx: AuditContext = {
      sessionId: 'pipe04',
      role: 'planner',
      childIds: [],
      records: [
        {
          step_index: 1,
          type: 'PLANNER_RESPONSE',
          tool_calls: [
            {
              name: 'write_file',
              args: { Path: 'tasks/TASK-999.md', Content: 'x' },
            },
          ],
        },
      ],
    };
    const findings = detectTaskValidateBypass(ctx);
    expect(findings.length).toBe(1);
    expect(findings[0].id).toBe('PIPE-04');
  });

  test('PIPE-05 detects abolished scout/reviewer invoke_subagent or define_subagent', () => {
    const ctx: AuditContext = {
      sessionId: 'pipe05',
      role: 'planner',
      childIds: [],
      records: [
        {
          step_index: 1,
          type: 'PLANNER_RESPONSE',
          tool_calls: [
            { name: 'invoke_subagent', args: { TypeName: 'scout' } },
          ],
        },
        {
          step_index: 2,
          type: 'PLANNER_RESPONSE',
          tool_calls: [{ name: 'define_subagent', args: { Name: 'reviewer' } }],
        },
      ],
    };
    const findings = detectAbolishedSubagentAttempt(ctx);
    expect(findings.length).toBe(2);
    expect(findings.every((f) => f.id === 'PIPE-05')).toBe(true);
  });

  test('EFF-01 detects worker turn bloat (>25) and peak token bloat (>180K)', () => {
    const records = Array.from({ length: 26 }, (_, i) => ({
      step_index: i + 1,
      type: 'PLANNER_RESPONSE' as const,
      input_tokens: i === 25 ? 190_000 : 1_000,
      cache_read_tokens: 0,
    }));
    const ctx: AuditContext = {
      sessionId: 'eff01',
      role: 'worker',
      childIds: [],
      records,
    };
    const findings = detectContextBloatAlert(ctx);
    expect(findings.length).toBe(2);
    expect(findings.every((f) => f.id === 'EFF-01')).toBe(true);
  });

  test('EFF-02 detects 3+ serial single invoke_subagent dispatches', () => {
    const ctx: AuditContext = {
      sessionId: 'eff02',
      role: 'planner',
      childIds: [],
      records: [1, 2, 3].map((step_index) => ({
        step_index,
        type: 'PLANNER_RESPONSE',
        tool_calls: [{ name: 'invoke_subagent', args: { TypeName: 'worker' } }],
      })),
    };
    const findings = detectSerialWorkerDispatch(ctx);
    expect(findings.length).toBe(1);
    expect(findings[0].id).toBe('EFF-02');
  });

  test('EFF-03 detects oversized invoke_subagent prompt (>1500 chars)', () => {
    const ctx: AuditContext = {
      sessionId: 'eff03',
      role: 'planner',
      childIds: [],
      records: [
        {
          step_index: 1,
          type: 'PLANNER_RESPONSE',
          tool_calls: [
            {
              name: 'invoke_subagent',
              args: { TypeName: 'worker', Prompt: 'a'.repeat(1600) },
            },
          ],
        },
      ],
    };
    const findings = detectPromptBloat(ctx);
    expect(findings.length).toBe(1);
    expect(findings[0].id).toBe('EFF-03');
  });

  test('PIPELINE_DETECTORS exports all 8 detectors', () => {
    expect(PIPELINE_DETECTORS.length).toBe(8);
  });
});

describe('quality & architecture detectors (QUAL-01..02)', () => {
  test('QUAL-01 detects biome-ignore, store vi.mock, and ignores .agents/ paths', () => {
    const ctx: AuditContext = {
      sessionId: 'qual01',
      role: 'worker',
      childIds: [],
      records: [
        {
          step_index: 1,
          type: 'PLANNER_RESPONSE',
          tool_calls: [
            {
              name: 'edit_file',
              args: {
                Path: 'src/app.ts',
                Replacement: '// biome-ignore lint/suspicious/noExplicitAny: x',
              },
            },
          ],
        },
        {
          step_index: 2,
          type: 'PLANNER_RESPONSE',
          tool_calls: [
            {
              name: 'write_file',
              args: {
                Path: 'tests/foo.test.ts',
                Content: "vi.mock('@/stores/tactical-store', () => ({}));",
              },
            },
          ],
        },
        {
          step_index: 3,
          type: 'PLANNER_RESPONSE',
          tool_calls: [
            {
              name: 'edit_file',
              args: {
                Path: '.agents/scripts/lib/audit/detectors/quality.ts',
                Replacement: "content.includes('biome-ignore')",
              },
            },
          ],
        },
      ],
    };
    const findings = detectQualityOrMockBypass(ctx);
    expect(findings.length).toBe(2);
    expect(findings.every((f) => f.id === 'QUAL-01')).toBe(true);
  });

  test('QUAL-02 detects whole-store subscription, CustomEvent, and legacy adapter in src/', () => {
    const ctx: AuditContext = {
      sessionId: 'qual02',
      role: 'worker',
      childIds: [],
      records: [
        {
          step_index: 1,
          type: 'PLANNER_RESPONSE',
          tool_calls: [
            {
              name: 'edit_file',
              args: {
                Path: 'src/components/Board.tsx',
                Replacement:
                  "const s = useTacticalStore();\nwindow.dispatchEvent(new CustomEvent('x'));\nuseTacticalUnifiedStore();",
              },
            },
          ],
        },
      ],
    };
    const findings = detectArchPatternViolation(ctx);
    expect(findings.length).toBe(3);
    expect(findings.every((f) => f.id === 'QUAL-02')).toBe(true);
  });

  test('QUALITY_DETECTORS exports both detectors', () => {
    expect(QUALITY_DETECTORS.length).toBe(2);
  });
});
