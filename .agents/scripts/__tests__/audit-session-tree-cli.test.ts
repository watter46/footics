import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { main } from '../audit-session';

describe('audit-session Phase 5: CLI --tree, Findings, and role label', () => {
  const tmpBrain = path.join(
    process.cwd(),
    '.agents/scripts/__tests__/fixtures-cli-tree',
  );

  const createSession = (
    id: string,
    opts: {
      firstType?: string;
      firstContent?: string;
      children?: string[];
      hasToolMissing?: boolean;
    },
  ) => {
    const dir = path.join(tmpBrain, id, '.system_generated', 'logs');
    fs.mkdirSync(dir, { recursive: true });

    const records: Array<Record<string, unknown>> = [
      {
        step_index: 0,
        type: opts.firstType ?? 'USER_INPUT',
        content: opts.firstContent ?? 'Initial request',
        created_at: '2026-10-22T10:00:00Z',
      },
      {
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        tool_calls:
          opts.children && opts.children.length > 0
            ? [{ name: 'invoke_subagent', args: { TypeName: 'worker' } }]
            : [{ name: 'view_file', args: { AbsolutePath: 'src/index.ts' } }],
        created_at: '2026-10-22T10:00:05Z',
      },
    ];

    if (opts.children && opts.children.length > 0) {
      records.push({
        step_index: 2,
        type: 'GENERIC',
        content: `Created the following subagent:\n${opts.children
          .map((c) => `{\n  "conversationId": "${c}"\n}`)
          .join(',\n')}`,
        created_at: '2026-10-22T10:00:06Z',
      });
    }

    if (opts.hasToolMissing) {
      // worker なのに write/cmd ツール未呼出
      records.push({
        step_index: 3,
        type: 'PLANNER_RESPONSE',
        thinking: 'ツールがないため編集できません',
        content: 'TASK_BLOCKED',
        created_at: '2026-10-22T10:00:10Z',
      });
    }

    fs.writeFileSync(
      path.join(dir, 'transcript.jsonl'),
      `${records.map((r) => JSON.stringify(r)).join('\n')}\n`,
    );
  };

  test('main() with --step-detail outputs detailed step range', () => {
    createSession('detail-session', { firstType: 'USER_INPUT' });
    const orig = process.env.BRAIN_DIR;
    process.env.BRAIN_DIR = tmpBrain;

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));

    try {
      const exitCode = main(['detail-session', '--step-detail', '0:1']);
      expect(exitCode).toBe(0);
      const combined = logs.join('\n');
      expect(combined).toContain('=== Step 0 [USER_INPUT]');
      expect(combined).toContain('=== Step 1 [PLANNER_RESPONSE]');
    } finally {
      console.log = origLog;
      if (orig !== undefined) process.env.BRAIN_DIR = orig;
      else delete process.env.BRAIN_DIR;
    }
  });

  test('main() with --tree outputs parent and child reports, Findings, and TREE SUMMARY', () => {
    createSession('root-cli', {
      firstType: 'USER_INPUT',
      children: ['child-worker-cli'],
    });
    createSession('child-worker-cli', {
      firstType: 'SYSTEM_MESSAGE',
      firstContent: 'type: "TASK_ASSIGN"\ntarget: "TASK-001.md"',
      hasToolMissing: true,
    });

    const orig = process.env.BRAIN_DIR;
    process.env.BRAIN_DIR = tmpBrain;

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));

    try {
      const exitCode = main(['root-cli', '--tree']);
      expect(exitCode).toBe(0);
      const output = logs.join('\n');

      expect(output).toContain(
        '=== AUDIT REPORT: root-cli [Planner / Coordinator] ===',
      );
      expect(output).toContain(
        '=== AUDIT REPORT: child-worker-cli [Worker] ===',
      );
      expect(output).toContain('=== AUDIT FINDINGS ===');
      expect(output).toContain(
        'INFRA-01 TOOL_MISSING session=child-worker-cli',
      );
      expect(output).toContain('=== TREE SUMMARY ===');
      expect(output).toContain('Sessions: 2');
    } finally {
      console.log = origLog;
      if (orig !== undefined) process.env.BRAIN_DIR = orig;
      else delete process.env.BRAIN_DIR;
      fs.rmSync(tmpBrain, { recursive: true, force: true });
    }
  });
});
