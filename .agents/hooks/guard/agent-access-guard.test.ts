import { describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { checkAgentAccessGuard, detectAgentRole } from './agent-access-guard';

describe('agent-access-guard', () => {
  const testDir = path.resolve('.agents/hooks/guard/__tests__/fixtures-access');

  function createTranscript(content: string): string {
    fs.mkdirSync(testDir, { recursive: true });
    const p = path.join(
      testDir,
      `transcript-${Date.now()}-${Math.random()}.jsonl`,
    );
    fs.writeFileSync(p, content);
    return p;
  }

  it('detects agent roles correctly', () => {
    // 1. Planner (USER_INPUT starting)
    const plannerFile = createTranscript(
      JSON.stringify({
        step_index: 0,
        type: 'USER_INPUT',
        content: 'Create feature',
      }),
    );
    expect(detectAgentRole(plannerFile)).toBe('planner');

    // 2. Scout (SCOUT_REQUEST)
    const scoutFile = createTranscript(
      JSON.stringify({
        step_index: 0,
        type: 'SYSTEM_MESSAGE',
        content: 'type: "SCOUT_REQUEST"\nInvestigate types',
      }),
    );
    expect(detectAgentRole(scoutFile)).toBe('scout');

    // 3. Worker (TASK_ASSIGN)
    const workerFile = createTranscript(
      JSON.stringify({
        step_index: 0,
        type: 'SYSTEM_MESSAGE',
        content: 'type: "TASK_ASSIGN"\nImplement phase 1',
      }),
    );
    expect(detectAgentRole(workerFile)).toBe('worker');

    // 4. Reviewer (REVIEW_REQUEST)
    const reviewerFile = createTranscript(
      JSON.stringify({
        step_index: 0,
        type: 'SYSTEM_MESSAGE',
        content: 'type: "REVIEW_REQUEST"\nReview task',
      }),
    );
    expect(detectAgentRole(reviewerFile)).toBe('reviewer');

    // 5. Unknown
    expect(detectAgentRole(undefined)).toBe('unknown');
    expect(detectAgentRole('/non/existent/path.jsonl')).toBe('unknown');

    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('denies all file modifications for scout role', () => {
    const scoutFile = createTranscript(
      JSON.stringify({
        step_index: 0,
        type: 'SYSTEM_MESSAGE',
        content: 'type: "SCOUT_REQUEST"',
      }),
    );

    const payload = {
      transcriptPath: scoutFile,
      toolCall: {
        name: 'replace_file_content',
        args: { TargetFile: '/home/watter46/src/footics/src/some-file.ts' },
      },
    };

    const res = checkAgentAccessGuard(payload);
    expect(res).not.toBeNull();
    expect(res?.decision).toBe('deny');
    expect(res?.reason).toContain('Scout is a read-only reconnaissance agent');

    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('denies source code modifications for reviewer role but allows tasks', () => {
    const reviewerFile = createTranscript(
      JSON.stringify({
        step_index: 0,
        type: 'SYSTEM_MESSAGE',
        content: 'type: "REVIEW_REQUEST"',
      }),
    );

    const codePayload = {
      transcriptPath: reviewerFile,
      toolCall: {
        name: 'replace_file_content',
        args: { TargetFile: '/home/watter46/src/footics/src/some-file.ts' },
      },
    };
    expect(checkAgentAccessGuard(codePayload)?.decision).toBe('deny');

    const taskPayload = {
      transcriptPath: reviewerFile,
      toolCall: {
        name: 'replace_file_content',
        args: { TargetFile: '/home/watter46/src/footics/tasks/TASK-001.md' },
      },
    };
    expect(checkAgentAccessGuard(taskPayload)?.decision).toBe('allow');

    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('denies source code modifications for planner role but allows tasks', () => {
    const plannerFile = createTranscript(
      JSON.stringify({
        step_index: 0,
        type: 'USER_INPUT',
        content: 'Start task',
      }),
    );

    const codePayload = {
      transcriptPath: plannerFile,
      toolCall: {
        name: 'write_to_file',
        args: {
          TargetFile: '/home/watter46/src/footics/src/components/New.tsx',
        },
      },
    };
    expect(checkAgentAccessGuard(codePayload)?.decision).toBe('deny');

    const taskPayload = {
      transcriptPath: plannerFile,
      toolCall: {
        name: 'write_to_file',
        args: { TargetFile: '/home/watter46/src/footics/tasks/TASK-001.md' },
      },
    };
    expect(checkAgentAccessGuard(taskPayload)?.decision).toBe('allow');

    // edit_file with Path
    const editCodePayload = {
      transcriptPath: plannerFile,
      toolCall: {
        name: 'edit_file',
        args: {
          Path: '"/home/watter46/src/footics/src/components/New.tsx"',
        },
      },
    };
    expect(checkAgentAccessGuard(editCodePayload)?.decision).toBe('deny');

    const editTaskPayload = {
      transcriptPath: plannerFile,
      toolCall: {
        name: 'edit_file',
        args: {
          Path: '/home/watter46/src/footics/tasks/TASK-001.md',
        },
      },
    };
    expect(checkAgentAccessGuard(editTaskPayload)?.decision).toBe('allow');

    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('verifies worker permissions correctly', () => {
    const workerFile = createTranscript(
      JSON.stringify({
        step_index: 0,
        type: 'SYSTEM_MESSAGE',
        content: 'type: "TASK_ASSIGN"',
      }),
    );

    // Worker can edit src/
    expect(
      checkAgentAccessGuard({
        transcriptPath: workerFile,
        toolCall: {
          name: 'edit_file',
          args: { Path: '/home/watter46/src/footics/src/lib/utils.ts' },
        },
      })?.decision,
    ).toBe('allow');

    // Worker cannot edit .agents/
    expect(
      checkAgentAccessGuard({
        transcriptPath: workerFile,
        toolCall: {
          name: 'edit_file',
          args: { Path: '/home/watter46/src/footics/.agents/hooks.json' },
        },
      })?.decision,
    ).toBe('deny');

    // Worker cannot edit package.json
    expect(
      checkAgentAccessGuard({
        transcriptPath: workerFile,
        toolCall: {
          name: 'write_file',
          args: { Path: '/home/watter46/src/footics/package.json' },
        },
      })?.decision,
    ).toBe('deny');

    fs.rmSync(testDir, { recursive: true, force: true });
  });
});
