import { describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { checkSubagentGuard } from './subagent-guard';

describe('checkSubagentGuard', () => {
  it('allows non-send_message tool calls', () => {
    const payload = {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'echo hello' },
      },
    };
    expect(checkSubagentGuard(payload)).toBeNull();
  });

  it('allows send_message to reviewer or unknown recipients', () => {
    const payload = {
      toolCall: {
        name: 'send_message',
        args: {
          Recipient: 'reviewer-id-123',
          Message: 'Please review',
        },
      },
    };
    expect(checkSubagentGuard(payload)).toEqual({ decision: 'allow' });
  });

  it('denies send_message to a worker that has already completed its task', () => {
    const testDir = path.resolve('.agents/hooks/guard/__tests__/fixtures');
    fs.mkdirSync(testDir, { recursive: true });

    const parentTranscript = path.join(testDir, 'parent-transcript.jsonl');
    const workerId = 'worker-finished-999';

    // 親のログに、該当Workerからの TASK_COMPLETE が届いている
    fs.writeFileSync(
      parentTranscript,
      JSON.stringify({
        step_index: 10,
        source: 'MODEL',
        type: 'PLANNER_RESPONSE',
        tool_calls: [{ name: 'send_message', args: { Recipient: workerId } }],
      }) +
        '\n' +
        JSON.stringify({
          step_index: 11,
          source: workerId,
          type: 'GENERIC',
          content:
            'type: "TASK_COMPLETE"\ntarget_file: "tasks/TASK-001.md"\nphase: 1',
        }) +
        '\n',
    );

    const payload = {
      transcriptPath: parentTranscript,
      toolCall: {
        name: 'send_message',
        args: {
          Recipient: workerId,
          Message: 'Here is Phase 2 for you to implement',
        },
      },
    };

    const res = checkSubagentGuard(payload);
    expect(res).not.toBeNull();
    expect(res?.decision).toBe('deny');
    expect(res?.reason).toContain('Worker reuse prohibited');
    expect(res?.reason).toContain('manage_subagents');

    // クリーンアップ
    fs.rmSync(testDir, { recursive: true, force: true });
  });
});
