import { describe, expect, test } from 'bun:test';
import {
  type AuditReport,
  auditSession,
  detectBypasses,
  detectHookDenials,
  detectSubagentContracts,
  extractTimeBreakdown,
  findChildSubagentIds,
  type TranscriptRecord,
} from '../audit-session';

describe('extractTimeBreakdown', () => {
  test('separates think time and tool execution time correctly', () => {
    const records: TranscriptRecord[] = [
      {
        step_index: 0,
        type: 'USER_INPUT',
        content: 'start',
        created_at: '2026-10-19T10:00:00.000Z',
      },
      {
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        tool_calls: [{ name: 'run_command', args: { CommandLine: 'ls' } }],
        created_at: '2026-10-19T10:00:05.000Z', // 5s think time
      },
      {
        step_index: 2,
        type: 'GENERIC',
        source: 'MODEL',
        content: 'The command exited with code 0.\nfile.ts',
        created_at: '2026-10-19T10:00:08.000Z', // 3s tool exec time
      },
      {
        step_index: 3,
        type: 'PLANNER_RESPONSE',
        content: 'Done',
        created_at: '2026-10-19T10:00:10.000Z', // 2s think time
      },
    ];

    const result = extractTimeBreakdown(records);
    expect(result.thinkSec).toBe(7); // 5s + 2s
    expect(result.toolSec).toBe(3); // 3s
    expect(result.totalSec).toBe(10);
  });
});

describe('detectHookDenials and Bypasses', () => {
  test('detects pre-tool hook denial and subsequent bypass command', () => {
    const records: TranscriptRecord[] = [
      {
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        tool_calls: [
          {
            name: 'view_file',
            args: { AbsolutePath: '/foo.ts', StartLine: 1, EndLine: 20 },
          },
        ],
      },
      {
        step_index: 2,
        type: 'GENERIC',
        source: 'MODEL',
        content:
          'Encountered error in tool execution: tool call denied by pre-tool hook: [GUARD] Slicing small files is prohibited',
      },
      {
        step_index: 3,
        type: 'PLANNER_RESPONSE',
        tool_calls: [
          {
            name: 'run_command',
            args: { CommandLine: 'cat /foo.ts | head -n 20' },
          },
        ],
      },
    ];

    const denials = detectHookDenials(records);
    expect(denials.length).toBe(1);
    expect(denials[0].hookReason).toContain(
      'Slicing small files is prohibited',
    );
    expect(denials[0].subsequentTurnAction).toBe(
      'run_command: cat /foo.ts | head -n 20',
    );

    const bypasses = detectBypasses(records);
    expect(bypasses.some((b) => b.type === 'guard_bypass')).toBe(true);
  });

  test('detects quality gate bypass (biome-ignore / test.skip)', () => {
    const records: TranscriptRecord[] = [
      {
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        tool_calls: [
          {
            name: 'replace_file_content',
            args: {
              TargetFile: '/src/a.ts',
              ReplacementContent:
                '// biome-ignore lint/suspicious: bypass\nconst x: any = 1;',
            },
          },
        ],
      },
    ];

    const bypasses = detectBypasses(records);
    expect(bypasses.some((b) => b.type === 'quality_gate_bypass')).toBe(true);
    expect(bypasses[0].description).toContain('biome-ignore');
  });
});

describe('detectSubagentContracts', () => {
  test('flags dynamic subagents without rules in system_prompt', () => {
    const records: TranscriptRecord[] = [
      {
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        tool_calls: [
          {
            name: 'define_subagent',
            args: {
              name: 'naked-worker',
              system_prompt:
                'あなたは作業者です。指示に従って実装してください。',
            },
          },
        ],
      },
    ];

    const contracts = detectSubagentContracts(records);
    expect(contracts.length).toBe(1);
    expect(contracts[0].hasRules).toBe(false);
    expect(contracts[0].missingElements).toContain('token_reduction_rules');
  });
});

describe('findChildSubagentIds', () => {
  test('extracts conversationIds of subagents spawned after a given step', () => {
    const records: TranscriptRecord[] = [
      {
        step_index: 10,
        type: 'USER_INPUT',
        content: '承認',
      },
      {
        step_index: 11,
        type: 'PLANNER_RESPONSE',
        tool_calls: [{ name: 'invoke_subagent', args: {} }],
      },
      {
        step_index: 12,
        type: 'GENERIC',
        content:
          'Created the following subagents:\n{\n  "conversationId":  "child-123",\n  "role": "worker"\n}',
      },
    ];

    const ids = findChildSubagentIds(records, 10);
    expect(ids).toEqual(['child-123']);
  });
});
