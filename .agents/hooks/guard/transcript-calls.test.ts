import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import {
  cleanString,
  getRecentToolCalls,
  parseLineNum,
} from './transcript-calls';

describe('transcript-calls', () => {
  const testDir = path.resolve('.agents/hooks/guard/__tests__/fixtures-calls');

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  function createTranscript(steps: any[]): string {
    const p = path.join(testDir, `t-${Math.random()}.jsonl`);
    fs.writeFileSync(p, `${steps.map((s) => JSON.stringify(s)).join('\n')}\n`);
    return p;
  }

  it('cleanString strips surrounding quotes', () => {
    expect(cleanString('"list"')).toBe('list');
    expect(cleanString("'list'")).toBe('list');
    expect(cleanString(' list ')).toBe('list');
    expect(cleanString(undefined)).toBe('');
  });

  it('parseLineNum parses numbers and quoted numeric strings', () => {
    expect(parseLineNum(5)).toBe(5);
    expect(parseLineNum('"12"')).toBe(12);
    expect(parseLineNum(undefined)).toBeUndefined();
    expect(parseLineNum('abc')).toBeUndefined();
  });

  it('returns tool calls in chronological order after the last boundary', () => {
    const p = createTranscript([
      { step_index: 0, type: 'USER_INPUT', content: 'old' },
      {
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        tool_calls: [{ name: 'old_call', args: {} }],
      },
      { step_index: 2, type: 'USER_INPUT', content: 'new' },
      {
        step_index: 3,
        type: 'PLANNER_RESPONSE',
        tool_calls: [
          { name: 'a', args: { x: 1 } },
          { name: 'b', args: {} },
        ],
      },
      { step_index: 4, type: 'GENERIC', content: 'result' },
      {
        step_index: 5,
        type: 'PLANNER_RESPONSE',
        tool_calls: [{ name: 'c', args: {} }],
      },
    ]);
    expect(getRecentToolCalls(p).map((c) => c.name)).toEqual(['a', 'b', 'c']);
  });

  it('treats SYSTEM_MESSAGE as a boundary', () => {
    const p = createTranscript([
      {
        step_index: 0,
        type: 'PLANNER_RESPONSE',
        tool_calls: [{ name: 'before', args: {} }],
      },
      { step_index: 1, type: 'SYSTEM_MESSAGE', content: 'child done' },
      {
        step_index: 2,
        type: 'PLANNER_RESPONSE',
        tool_calls: [{ name: 'after', args: {} }],
      },
    ]);
    expect(getRecentToolCalls(p).map((c) => c.name)).toEqual(['after']);
  });

  it('returns [] for missing path or unreadable transcript', () => {
    expect(getRecentToolCalls(undefined)).toEqual([]);
    expect(getRecentToolCalls('/nonexistent/transcript.jsonl')).toEqual([]);
  });
});
