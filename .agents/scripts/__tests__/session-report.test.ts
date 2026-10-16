import { describe, expect, test } from 'bun:test';
import {
  analyze,
  BUDGET,
  commandFamily,
  countMergeable,
  parseJsonl,
  renderReport,
  type TranscriptRecord,
} from '../session-report';

function planner(
  step: number,
  cmd: string,
  tokens: { i: number; c: number; o: number } = { i: 2000, c: 15000, o: 60 },
): TranscriptRecord {
  return {
    step_index: step,
    type: 'PLANNER_RESPONSE',
    input_tokens: tokens.i,
    cache_read_tokens: tokens.c,
    output_tokens: tokens.o,
    tool_calls: [{ name: 'run_command', args: { CommandLine: `"${cmd}"` } }],
  };
}

function result(step: number, content: string): TranscriptRecord {
  return { step_index: step, type: 'GENERIC', source: 'MODEL', content };
}

const user = (step: number, text: string): TranscriptRecord => ({
  step_index: step,
  type: 'USER_INPUT',
  content: `<USER_REQUEST>${text}</USER_REQUEST>`,
});

describe('commandFamily', () => {
  test('strips rtk, env assignment and keeps first two tokens', () => {
    expect(commandFamily('"rtk git status"')).toBe('git status');
    expect(commandFamily('GIT_EXTERNAL_DIFF=difft rtk git diff -U1 a.ts')).toBe(
      'git diff',
    );
    expect(commandFamily('bun test ./a.test.ts')).toBe('bun test');
  });
});

describe('analyze: ideal 3-turn commit trace', () => {
  const records = [
    user(0, 'commit please'),
    planner(1, 'bun run agent:preflight'),
    result(2, 'The command exited with code 0.\nPREFLIGHT ok'),
    planner(3, 'git add a && git commit -m x'),
    result(4, 'The command exited with code 0.\n[main abc] x'),
    {
      step_index: 5,
      type: 'PLANNER_RESPONSE',
      input_tokens: 2000,
      cache_read_tokens: 16000,
      output_tokens: 200,
    },
  ];
  const [seg] = analyze(records);

  test('meets budget', () => {
    expect(seg.totals.turns).toBe(3);
    expect(seg.budgetOk).toBe(true);
    expect(seg.counts.fail).toBe(0);
    expect(seg.counts.redo).toBe(0);
  });

  test('sums tokens', () => {
    expect(seg.totals.input).toBe(6000);
    expect(seg.totals.cache).toBe(46000);
  });
});

describe('analyze: bad trace from the real incident', () => {
  const records = [
    user(0, 'git commit'),
    planner(1, 'rtk git status'),
    result(2, 'The command exited with code 0.\nok'),
    planner(3, 'rtk vitest run a'),
    result(4, 'The command exited with code 1.\nPASS (0) FAIL (0)'),
    planner(5, 'rtk vitest run b'),
    result(6, 'The command exited with code 1.\nPASS (0) FAIL (0)'),
    planner(7, 'rtk git diff -U1'),
    result(8, `The command exited with code 0.\n${'x'.repeat(4000)}`),
  ];
  const [seg] = analyze(records);

  test('flags FAIL and REDO', () => {
    expect(seg.rows[1].flags).toContain('FAIL(exit1)');
    expect(seg.rows[2].flags).toEqual(['FAIL(exit1)', 'REDO']);
    expect(seg.counts.fail).toBe(2);
    expect(seg.counts.redo).toBe(1);
  });

  test('flags oversized result and budget NG', () => {
    expect(seg.counts.maxResultBytes).toBeGreaterThan(BUDGET.maxResultBytes);
    expect(seg.budgetOk).toBe(false);
    expect(seg.failures.join(' ')).toContain('fail 2>0');
  });
});

describe('countMergeable', () => {
  const row = (readOnly: boolean, calls = 1) =>
    ({ readOnly, calls, flags: [] }) as never;

  test('counts consecutive single-call read-only turns', () => {
    expect(
      countMergeable([row(true), row(true), row(true), row(false), row(true)]),
    ).toBe(2);
  });

  test('parallel calls are not mergeable', () => {
    expect(countMergeable([row(true, 3), row(true, 2)])).toBe(0);
  });
});

describe('segments and rendering', () => {
  test('splits by USER_INPUT and renders last segment', () => {
    const records = [
      user(0, 'first'),
      planner(1, 'rtk ls'),
      result(2, 'The command exited with code 0.\n'),
      user(3, 'second'),
      planner(4, 'bun run agent:preflight'),
      result(5, 'The command exited with code 0.\n'),
    ];
    const segs = analyze(records);
    expect(segs.length).toBe(2);
    const text = renderReport(segs);
    expect(text).toContain('SESSION segments=2');
    expect(text).toContain('SEGMENT 2 "second"');
    expect(text).toContain('BUDGET ok');
  });

  test('parseJsonl skips malformed lines', () => {
    expect(parseJsonl('{"step_index":1,"type":"X"}\nnot json\n').length).toBe(
      1,
    );
  });

  test('handles subagent transcripts starting with SYSTEM_MESSAGE', () => {
    const records = [
      {
        step_index: 0,
        type: 'SYSTEM_MESSAGE',
        source: 'SYSTEM',
        content:
          'The following is a <SYSTEM_MESSAGE>Implement Phase 1</SYSTEM_MESSAGE>',
      },
      planner(1, 'rtk ls'),
      result(2, 'The command exited with code 0.\n'),
    ];
    const segs = analyze(records);
    expect(segs.length).toBe(1);
    expect(segs[0].request).toContain('Implement Phase 1');
    expect(segs[0].totals.turns).toBe(1);
  });
});
