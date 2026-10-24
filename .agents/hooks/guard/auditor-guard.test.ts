import { describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import {
  AUDITOR_ALLOWED_EXECUTABLES,
  checkAuditorGuard,
  isRawTranscriptTarget,
} from './auditor-guard';

describe('auditor-guard', () => {
  const testDir = path.resolve(
    '.agents/hooks/guard/__tests__/fixtures-auditor',
  );

  function createTranscript(content: string): string {
    fs.mkdirSync(testDir, { recursive: true });
    const p = path.join(
      testDir,
      `transcript-${Date.now()}-${Math.random()}.jsonl`,
    );
    fs.writeFileSync(p, content);
    return p;
  }

  it('verifies AUDITOR_ALLOWED_EXECUTABLES and isRawTranscriptTarget', () => {
    expect(AUDITOR_ALLOWED_EXECUTABLES).toContain('bun');
    expect(AUDITOR_ALLOWED_EXECUTABLES).toContain('rtk');
    expect(AUDITOR_ALLOWED_EXECUTABLES).toContain('git');
    expect(AUDITOR_ALLOWED_EXECUTABLES).toContain('jq');

    expect(isRawTranscriptTarget('/path/to/transcript.jsonl')).toBe(true);
    expect(isRawTranscriptTarget('/path/to/transcript_full.jsonl')).toBe(true);
    expect(
      isRawTranscriptTarget('/path/to/.system_generated/logs/transcript.jsonl'),
    ).toBe(true);
    expect(isRawTranscriptTarget('/path/to/src/index.ts')).toBe(false);
  });

  it('ignores non-auditor roles', () => {
    const plannerFile = createTranscript(
      JSON.stringify({
        step_index: 0,
        type: 'USER_INPUT',
        content: 'Planner command',
      }),
    );

    const res = checkAuditorGuard({
      transcriptPath: plannerFile,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'python3 -c "print(1)"' },
      },
    });
    expect(res).toBeNull();

    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('denies raw transcript reads for auditor role', () => {
    const auditorFile = createTranscript(
      JSON.stringify({
        step_index: 0,
        type: 'SYSTEM_MESSAGE',
        content: 'type: "AUDIT_REQUEST"',
      }),
    );

    // 1. read_file directly on transcript.jsonl
    const readPayload = {
      transcriptPath: auditorFile,
      toolCall: {
        name: 'read_file',
        args: {
          Path: '/home/watter46/.gemini/antigravity-cli/brain/c2ed8fa3/.system_generated/logs/transcript.jsonl',
        },
      },
    };
    const readRes = checkAuditorGuard(readPayload);
    expect(readRes?.decision).toBe('deny');
    expect(readRes?.reason).toContain('direct transcript');

    // 2. cat on transcript.jsonl via run_command
    const catPayload = {
      transcriptPath: auditorFile,
      toolCall: {
        name: 'run_command',
        args: {
          CommandLine: 'cat /path/to/transcript.jsonl',
        },
      },
    };
    const catRes = checkAuditorGuard(catPayload);
    expect(catRes?.decision).toBe('deny');

    // 3. jq on transcript_full.jsonl
    const jqPayload = {
      transcriptPath: auditorFile,
      toolCall: {
        name: 'run_command',
        args: {
          CommandLine: 'jq . /path/to/transcript_full.jsonl',
        },
      },
    };
    expect(checkAuditorGuard(jqPayload)?.decision).toBe('deny');

    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('controls command executables for auditor role', () => {
    const auditorFile = createTranscript(
      JSON.stringify({
        step_index: 0,
        type: 'SYSTEM_MESSAGE',
        content: 'type: "AUDIT_REQUEST"',
      }),
    );

    // 1. Prohibited executable (python3)
    const pyPayload = {
      transcriptPath: auditorFile,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'python3 script.py' },
      },
    };
    expect(checkAuditorGuard(pyPayload)?.decision).toBe('deny');

    // 2. Allowed bun run ai:audit
    const auditPayload = {
      transcriptPath: auditorFile,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'bun run ai:audit c2ed8fa3-3d8b --tree' },
      },
    };
    expect(checkAuditorGuard(auditPayload)).toBeNull();

    // 3. Allowed bun run ai:report
    const reportPayload = {
      transcriptPath: auditorFile,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'bun run ai:report latest' },
      },
    };
    expect(checkAuditorGuard(reportPayload)).toBeNull();

    // 3b. Allowed bun test ./.agents and bun run task:validate
    const bunTestPayload = {
      transcriptPath: auditorFile,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'bun test ./.agents' },
      },
    };
    expect(checkAuditorGuard(bunTestPayload)).toBeNull();

    const taskValidatePayload = {
      transcriptPath: auditorFile,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'bun run task:validate tasks/TASK-001.md' },
      },
    };
    expect(checkAuditorGuard(taskValidatePayload)).toBeNull();

    // 4. Prohibited bun run ai:check
    const checkPayload = {
      transcriptPath: auditorFile,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'bun run ai:check src/index.ts' },
      },
    };
    expect(checkAuditorGuard(checkPayload)?.decision).toBe('deny');

    // 5. Allowed git show / log / diff
    const gitShowPayload = {
      transcriptPath: auditorFile,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'git show f174fad --stat' },
      },
    };
    expect(checkAuditorGuard(gitShowPayload)).toBeNull();

    // 6. Prohibited git commit / push
    const gitCommitPayload = {
      transcriptPath: auditorFile,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'git commit -m "hack"' },
      },
    };
    expect(checkAuditorGuard(gitCommitPayload)?.decision).toBe('deny');

    // 7. Allowed rtk read / grep
    const rtkPayload = {
      transcriptPath: auditorFile,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'rtk grep "test" src/foo.ts' },
      },
    };
    expect(checkAuditorGuard(rtkPayload)).toBeNull();

    // 8. Prohibited subagent spawning (Auditor must operate directly without subagents)
    const invokePayload = {
      transcriptPath: auditorFile,
      toolCall: {
        name: 'invoke_subagent',
        args: { TypeName: 'worker', Role: 'Worker', Prompt: 'Do task' },
      },
    };
    const invokeRes = checkAuditorGuard(invokePayload);
    expect(invokeRes?.decision).toBe('deny');
    expect(invokeRes?.reason).toContain('prohibited from spawning subagents');

    const definePayload = {
      transcriptPath: auditorFile,
      toolCall: {
        name: 'define_subagent',
        args: { Name: 'custom-worker', Description: 'desc', SystemPrompt: 'p' },
      },
    };
    const defineRes = checkAuditorGuard(definePayload);
    expect(defineRes?.decision).toBe('deny');
    expect(defineRes?.reason).toContain('prohibited from spawning subagents');

    fs.rmSync(testDir, { recursive: true, force: true });
  });
});
