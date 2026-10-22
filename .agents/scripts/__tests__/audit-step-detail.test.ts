import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TranscriptRecord } from '../audit-session';
import {
  renderStepDetail,
  resolveFullTranscript,
} from '../lib/audit/step-detail';

describe('audit-session Phase 4: step-detail', () => {
  test('resolveFullTranscript prefers transcript_full.jsonl over transcript.jsonl', () => {
    const tmpBrain = path.join(
      process.cwd(),
      '.agents/scripts/__tests__/fixtures-full-transcript',
    );
    const sessionDir = path.join(
      tmpBrain,
      'test-session',
      '.system_generated',
      'logs',
    );
    fs.mkdirSync(sessionDir, { recursive: true });

    const compactLog = path.join(sessionDir, 'transcript.jsonl');
    const fullLog = path.join(sessionDir, 'transcript_full.jsonl');

    fs.writeFileSync(compactLog, '{"step_index":0}\n');
    fs.writeFileSync(fullLog, '{"step_index":0,"full":true}\n');

    try {
      const orig = process.env.BRAIN_DIR;
      process.env.BRAIN_DIR = tmpBrain;
      const resolved = resolveFullTranscript('test-session');
      expect(resolved).toBe(fullLog);

      // fullLog を削除した場合は compactLog にフォールバック
      fs.unlinkSync(fullLog);
      const fallback = resolveFullTranscript('test-session');
      expect(fallback).toBe(compactLog);

      if (orig !== undefined) {
        process.env.BRAIN_DIR = orig;
      } else {
        delete process.env.BRAIN_DIR;
      }
    } finally {
      fs.rmSync(tmpBrain, { recursive: true, force: true });
    }
  });

  test('renderStepDetail clamps to maximum 10 steps and formats fields with length limits', () => {
    const records: TranscriptRecord[] = [];
    for (let i = 0; i < 20; i++) {
      records.push({
        step_index: i,
        type: i % 2 === 0 ? 'PLANNER_RESPONSE' : 'GENERIC',
        status: i % 2 === 0 ? undefined : 'DONE',
        created_at: `2026-10-22T10:${i.toString().padStart(2, '0')}:00Z`,
        thinking: i === 0 ? 'Thinking short' : 'T'.repeat(500),
        content: i === 1 ? 'C'.repeat(2000) : 'Content normal',
        tool_calls:
          i % 2 === 0
            ? [
                {
                  name: 'run_command',
                  args: { CommandLine: 'A'.repeat(800) },
                },
              ]
            : undefined,
      });
    }

    // 0〜15 の 16 ステップを指定 -> 10 ステップにクランプ
    const output = renderStepDetail(records, { start: 0, end: 15 });

    expect(output).toContain('(clamped to 10 steps)');
    expect(output).toContain('=== Step 0 [PLANNER_RESPONSE]');
    expect(output).toContain('=== Step 9 [GENERIC]');
    expect(output).not.toContain('=== Step 10 [');

    // content の 1500 文字制限
    expect(output).toContain('…(+500 chars)');
    // thinking の 400 文字制限
    expect(output).toContain('…(+100 chars)');
    // args の 600 文字制限
    expect(output).toContain('…(+');
  });

  test('renderStepDetail handles empty or out-of-range steps gracefully', () => {
    const records: TranscriptRecord[] = [
      { step_index: 1, type: 'USER_INPUT', content: 'hello' },
    ];
    const output = renderStepDetail(records, { start: 10, end: 15 });
    expect(output).toContain('(No records in range 10:15)');
  });
});
