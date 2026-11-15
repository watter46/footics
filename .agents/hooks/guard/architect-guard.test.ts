import { afterAll, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { checkArchitectGuard } from './architect-guard';

describe('architect-guard', () => {
  const testDir = path.resolve(
    '.agents/hooks/guard/__tests__/fixtures-architect',
  );

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  function createTranscript(content: string): string {
    fs.mkdirSync(testDir, { recursive: true });
    const p = path.join(
      testDir,
      `transcript-${Date.now()}-${Math.random()}.jsonl`,
    );
    fs.writeFileSync(p, content);
    return p;
  }

  const architectTranscript = createTranscript(
    JSON.stringify({
      step_index: 0,
      type: 'USER_INPUT',
      content: 'tactical-architect としてルールと型を改善して',
    }),
  );

  const plannerTranscript = createTranscript(
    JSON.stringify({
      step_index: 0,
      type: 'USER_INPUT',
      content: 'Plan this feature',
    }),
  );

  it('ignores non-architect roles', () => {
    const payload = {
      transcriptPath: plannerTranscript,
      toolCall: {
        name: 'invoke_subagent',
        args: { TypeName: 'worker' },
      },
    };
    expect(checkArchitectGuard(payload)).toBeNull();

    const cmdPayload = {
      transcriptPath: plannerTranscript,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'vitest run' },
      },
    };
    expect(checkArchitectGuard(cmdPayload)).toBeNull();
  });

  describe('subagent restrictions', () => {
    it('denies invoke_subagent for all types including scout, worker, and reviewer', () => {
      for (const typeName of ['scout', 'worker', 'reviewer']) {
        const payload = {
          transcriptPath: architectTranscript,
          toolCall: {
            name: 'invoke_subagent',
            args: { TypeName: typeName },
          },
        };
        const res = checkArchitectGuard(payload);
        expect(res?.decision).toBe('deny');
        expect(res?.reason).toContain(
          'Architect is prohibited from spawning subagents',
        );
      }
    });

    it('denies define_subagent', () => {
      const payload = {
        transcriptPath: architectTranscript,
        toolCall: {
          name: 'define_subagent',
          args: { name: 'custom' },
        },
      };
      const res = checkArchitectGuard(payload);
      expect(res?.decision).toBe('deny');
      expect(res?.reason).toContain(
        "Dynamic subagent definition with 'define_subagent' is prohibited",
      );
    });
  });

  describe('direct transcript read restrictions', () => {
    it('denies read_file or view_file directly on transcript files', () => {
      const viewPayload = {
        transcriptPath: architectTranscript,
        toolCall: {
          name: 'view_file',
          args: {
            Path: '/home/watter46/.gemini/antigravity-cli/brain/123/.system_generated/logs/transcript.jsonl',
          },
        },
      };
      const res = checkArchitectGuard(viewPayload);
      expect(res?.decision).toBe('deny');
      expect(res?.reason).toContain(
        'Architect is prohibited from direct transcript reads',
      );
    });

    it('denies shell commands referencing transcript files', () => {
      const cmdPayload = {
        transcriptPath: architectTranscript,
        toolCall: {
          name: 'run_command',
          args: {
            CommandLine:
              'cat /home/watter46/.gemini/antigravity-cli/brain/123/.system_generated/logs/transcript.jsonl',
          },
        },
      };
      const res = checkArchitectGuard(cmdPayload);
      expect(res?.decision).toBe('deny');
    });
  });

  describe('command execution restrictions', () => {
    it('allows permitted analysis tools and scripts', () => {
      const permitted = [
        'bun run ai:peek src/components/Stage.tsx',
        'bun run ai:impact Stage',
        'bun run ai:report latest',
        'bun test ./.agents',
        'bun test .agents/hooks/guard',
        'rtk grep "interface" src/types.ts',
        'git diff HEAD~1',
        'git show HEAD:src/index.ts',
        'git status',
        'git log -n 5',
        'ast-grep run -p "class $A" -l ts src',
        'fd -t f . agents',
      ];

      for (const cmdLine of permitted) {
        const payload = {
          transcriptPath: architectTranscript,
          toolCall: {
            name: 'run_command',
            args: { CommandLine: cmdLine },
          },
        };
        expect(checkArchitectGuard(payload)).toBeNull();
      }
    });

    it('denies unauthorized executables and write/build commands', () => {
      const unauthorized = [
        'bun run ' + 'ai:' + 'outline src/a.ts',
        'bun run ' + 'ai:' + 'find Stage',
        'npm install',
        'vitest run src/test.ts',
        'bun run dev',
        'bun run build',
        'bun test src/components/Stage.test.tsx',
        'git commit -m "commit"',
        'node script.js',
      ];

      for (const cmdLine of unauthorized) {
        const payload = {
          transcriptPath: architectTranscript,
          toolCall: {
            name: 'run_command',
            args: { CommandLine: cmdLine },
          },
        };
        const res = checkArchitectGuard(payload);
        expect(res?.decision).toBe('deny');
      }
    });
  });
});
