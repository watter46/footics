import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  detectHookDenials,
  findChildSubagentIds,
  type TranscriptRecord,
} from '../audit-session';
import { collectSessionTree } from '../lib/audit/tree';

describe('audit-session Phase 2: denials false-positive fix, child ID regex, tree traversal', () => {
  test('detectHookDenials ignores status: DONE steps containing [GUARD] or [GATEGUARD]', () => {
    const records: TranscriptRecord[] = [
      {
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        tool_calls: [{ name: 'read_file', args: { Path: 'test.ts' } }],
      },
      {
        step_index: 2,
        type: 'GENERIC',
        status: 'DONE',
        content:
          '1: // [GUARD] This is a comment inside a file that should not count as denial\n2: console.log("ok");',
      },
    ];

    const denials = detectHookDenials(records);
    expect(denials.length).toBe(0);
  });

  test('detectHookDenials detects status: ERROR steps with tool call denied by pre-tool hook', () => {
    const records: TranscriptRecord[] = [
      {
        step_index: 3,
        type: 'PLANNER_RESPONSE',
        tool_calls: [
          { name: 'run_command', args: { CommandLine: 'cat /path/to/file' } },
        ],
      },
      {
        step_index: 4,
        type: 'GENERIC',
        status: 'ERROR',
        content:
          'Encountered error in step execution: tool call denied by pre-tool hook: [GUARD] Direct cat is prohibited.',
      },
    ];

    const denials = detectHookDenials(records);
    expect(denials.length).toBe(1);
    expect(denials[0].step).toBe(4);
    expect(denials[0].tool).toBe('run_command');
    expect(denials[0].hookReason).toContain(
      '[GUARD] Direct cat is prohibited.',
    );
  });

  test('detectHookDenials still detects legacy records without status field', () => {
    const records: TranscriptRecord[] = [
      {
        step_index: 5,
        type: 'PLANNER_RESPONSE',
        tool_calls: [{ name: 'write_file', args: { Path: 'tasks/TASK.md' } }],
      },
      {
        step_index: 6,
        type: 'GENERIC',
        content: 'tool call denied by pre-tool hook: [GUARD] write prohibited',
      },
    ];

    const denials = detectHookDenials(records);
    expect(denials.length).toBe(1);
  });

  test('findChildSubagentIds extracts conversationId from both singular and plural headers', () => {
    const records: TranscriptRecord[] = [
      {
        step_index: 10,
        type: 'GENERIC',
        content:
          'Created the following subagent:\n{\n  "conversationId": "subagent-singular-111"\n}',
      },
      {
        step_index: 20,
        type: 'GENERIC',
        content:
          'Created the following subagents:\n{\n  "conversationId": "subagent-plural-222"\n},\n{\n  "conversationId": "subagent-plural-333"\n}',
      },
    ];

    const ids = findChildSubagentIds(records);
    expect(ids).toEqual([
      'subagent-singular-111',
      'subagent-plural-222',
      'subagent-plural-333',
    ]);
  });

  test('collectSessionTree traverses parent -> child -> grandchild and handles cycles and missing transcripts', () => {
    const tmpBrain = path.join(
      process.cwd(),
      '.agents/scripts/__tests__/fixtures-tree',
    );
    fs.mkdirSync(tmpBrain, { recursive: true });

    const createSession = (id: string, children: string[]) => {
      const dir = path.join(tmpBrain, id, '.system_generated', 'logs');
      fs.mkdirSync(dir, { recursive: true });
      const records: TranscriptRecord[] = [
        {
          step_index: 0,
          type: 'USER_INPUT',
          content: `Session ${id}`,
        },
      ];
      if (children.length > 0) {
        records.push({
          step_index: 1,
          type: 'GENERIC',
          content: `Created the following subagents:\n${children
            .map((c) => `{\n  "conversationId": "${c}"\n}`)
            .join(',\n')}`,
        });
      }
      fs.writeFileSync(
        path.join(dir, 'transcript.jsonl'),
        `${records.map((r) => JSON.stringify(r)).join('\n')}\n`,
      );
    };

    // 親 (root) -> 子 (childA, childB)
    // childA -> 孫 (grandchildA1, root [循環参照テスト])
    // childB -> 存在しないセッション (missingChild)
    createSession('root-session', ['child-a', 'child-b']);
    createSession('child-a', ['grandchild-a1', 'root-session']);
    createSession('child-b', ['missing-child']);
    createSession('grandchild-a1', []);

    try {
      const tree = collectSessionTree('root-session', {
        brainDir: tmpBrain,
        maxDepth: 3,
      });

      const ids = tree.map((n) => n.sessionId);
      expect(ids).toEqual([
        'root-session',
        'child-a',
        'child-b',
        'grandchild-a1',
      ]);
      expect(tree.find((n) => n.sessionId === 'root-session')?.depth).toBe(0);
      expect(tree.find((n) => n.sessionId === 'child-a')?.depth).toBe(1);
      expect(tree.find((n) => n.sessionId === 'child-b')?.depth).toBe(1);
      expect(tree.find((n) => n.sessionId === 'grandchild-a1')?.depth).toBe(2);
    } finally {
      fs.rmSync(tmpBrain, { recursive: true, force: true });
    }
  });
});
