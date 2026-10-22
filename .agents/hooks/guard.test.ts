import { describe, expect, test } from 'bun:test';
import { evaluateCommand, evaluatePayload, splitCommands } from './guard';

const BIOME_FLAGS =
  '--diagnostic-level=error --max-diagnostics=20 --reporter=concise';

describe('guard.ts Security & Token Guard Tests', () => {
  describe('1. Safety Guard - Destructive operations', () => {
    test('denies rm -rf / and rm -rf ~', () => {
      expect(evaluateCommand('rm -rf /').decision).toBe('deny');
      expect(evaluateCommand('rm -rf ~').decision).toBe('deny');
    });

    test('denies rm -rf on critical paths (.git, src, .agents)', () => {
      expect(evaluateCommand('rm -rf .git').decision).toBe('deny');
      expect(evaluateCommand('rm -rf src/').decision).toBe('deny');
      expect(evaluateCommand('rm -rf .agents').decision).toBe('deny');
    });

    test('requires confirmation (force_ask) for non-critical recursive rm', () => {
      const res = evaluateCommand('rm -rf .next');
      expect(res.decision).toBe('force_ask');
    });

    test('allows non-recursive rm on single temp files', () => {
      expect(evaluateCommand('rm scratch/temp.txt').decision).toBe('allow');
    });

    test('denies git push --force and git push -f', () => {
      expect(evaluateCommand('git push origin main --force').decision).toBe(
        'deny',
      );
      expect(evaluateCommand('git push origin main -f').decision).toBe('deny');
    });

    test('denies direct git commit and suggests bun run ai:commit', () => {
      const res = evaluateCommand('git commit -m "feat: test"');
      expect(res.decision).toBe('deny');
      expect(res.reason).toContain("Direct 'git commit' is prohibited");
      expect(res.reason).toContain('bun run ai:commit');
    });

    test('denies git commit --no-verify and git push --no-verify', () => {
      expect(
        evaluateCommand('git commit -m "bypass" --no-verify').decision,
      ).toBe('deny');
      expect(evaluateCommand('git push origin main --no-verify').decision).toBe(
        'deny',
      );
    });

    test('denies sudo and fork bombs', () => {
      expect(evaluateCommand('sudo apt-get update').decision).toBe('deny');
      expect(evaluateCommand(':(){ :|:& };:').decision).toBe('deny');
    });

    test('denies inline file editing via sed -i and perl -i', () => {
      const resSed = evaluateCommand("sed -i 's/foo/bar/g' src/file.ts");
      expect(resSed.decision).toBe('deny');
      expect(resSed.reason).toContain("'sed -i' is prohibited");

      const resPerl = evaluateCommand("perl -i -pe 's/foo/bar/' src/file.ts");
      expect(resPerl.decision).toBe('deny');
      expect(resPerl.reason).toContain("'perl -i' is prohibited");
    });

    test('denies shell redirection into source/config files', () => {
      const resRedir = evaluateCommand('echo "export const a = 1;" > src/a.ts');
      expect(resRedir.decision).toBe('deny');
      expect(resRedir.reason).toContain(
        'Shell redirection directly into source',
      );

      const resAppend = evaluateCommand('echo "test" >> package.json');
      expect(resAppend.decision).toBe('deny');
    });
  });

  describe('2. Token Guard - Transparent Rewriting (overwrite)', () => {
    test('rewrites raw ls to rtk ls', () => {
      const res = evaluateCommand('ls -la src');
      expect(res.decision).toBe('allow');
      expect(res.overwrite?.CommandLine).toBe('rtk ls -la src');
    });

    test('rewrites raw cat to rtk read', () => {
      const res = evaluateCommand('cat README.md');
      expect(res.decision).toBe('allow');
      expect(res.overwrite?.CommandLine).toBe('rtk read README.md');
    });

    test('rewrites raw grep to rtk grep', () => {
      const res = evaluateCommand('grep -rn "TODO" src/');
      expect(res.decision).toBe('allow');
      expect(res.overwrite?.CommandLine).toBe('rtk grep -rn "TODO" src/');
    });

    test('rewrites raw find to rtk find', () => {
      const res = evaluateCommand('find src -name "*.ts"');
      expect(res.decision).toBe('allow');
      expect(res.overwrite?.CommandLine).toBe('rtk find src -name "*.ts"');
    });

    test('rewrites tree to eza -T -L 2 --git-ignore', () => {
      const res = evaluateCommand('tree src');
      expect(res.decision).toBe('allow');
      expect(res.overwrite?.CommandLine).toBe('eza -T -L 2 --git-ignore src');
    });

    test('rewrites sg to ast-grep', () => {
      const res = evaluateCommand('sg -p "fn $A()" src');
      expect(res.decision).toBe('allow');
      expect(res.overwrite?.CommandLine).toBe('ast-grep -p "fn $A()" src');
    });

    test('rewrites git diff to GIT_EXTERNAL_DIFF=difft rtk git diff', () => {
      const res = evaluateCommand('git diff src');
      expect(res.decision).toBe('allow');
      expect(res.overwrite?.CommandLine).toBe(
        'GIT_EXTERNAL_DIFF=difft rtk git diff src',
      );
    });

    test('rewrites git status and git log to rtk git', () => {
      expect(evaluateCommand('git status').overwrite?.CommandLine).toBe(
        'rtk git status',
      );
      expect(evaluateCommand('git log -n 5').overwrite?.CommandLine).toBe(
        'rtk git log -n 5',
      );
    });

    test('rewrites tsc, biome, vitest, next, playwright to rtk (with or without runners)', () => {
      expect(evaluateCommand('tsc').overwrite?.CommandLine).toBe('rtk tsc');
      expect(evaluateCommand('bunx tsc --noEmit').overwrite?.CommandLine).toBe(
        'rtk tsc --noEmit',
      );
      expect(evaluateCommand('biome check .').overwrite?.CommandLine).toBe(
        `biome check . ${BIOME_FLAGS}`,
      );
      expect(evaluateCommand('bunx biome check .').overwrite?.CommandLine).toBe(
        `bunx biome check . ${BIOME_FLAGS}`,
      );
      expect(evaluateCommand('vitest run').overwrite?.CommandLine).toBe(
        'rtk vitest run',
      );
      expect(evaluateCommand('bunx vitest run').overwrite?.CommandLine).toBe(
        'rtk vitest run',
      );
      expect(evaluateCommand('npx vitest run').overwrite?.CommandLine).toBe(
        'rtk vitest run',
      );
      expect(evaluateCommand('next build').overwrite?.CommandLine).toBe(
        'rtk next build',
      );
      expect(evaluateCommand('playwright test').overwrite?.CommandLine).toBe(
        'rtk playwright test',
      );
      expect(evaluateCommand('bun test ./.agents').overwrite?.CommandLine).toBe(
        'rtk test bun test ./.agents',
      );
    });

    test('evaluates payload for view_file on log files and write_to_file for new files', () => {
      // view_file without slice on tee log is denied
      const resLog = evaluatePayload({
        toolCall: {
          name: 'view_file',
          args: { AbsolutePath: '/home/watter46/.local/share/rtk/tee/123.log' },
        },
      });
      expect(resLog.decision).toBe('deny');
      expect(resLog.reason).toContain('Reading entire log files');

      // view_file with slice on tee log is allowed
      const resLogSlice = evaluatePayload({
        toolCall: {
          name: 'view_file',
          args: {
            AbsolutePath: '/home/watter46/.local/share/rtk/tee/123.log',
            StartLine: 1,
            EndLine: 50,
          },
        },
      });
      expect(resLogSlice.decision).toBe('allow');

      // write_to_file for non-existent file is allowed without read history
      const resNewFile = evaluatePayload({
        toolCall: {
          name: 'write_to_file',
          args: {
            TargetFile: '/tmp/non-existent-test-file-999.md',
            Overwrite: true,
          },
        },
      });
      expect(resNewFile.decision).toBe('allow');
    });

    test('view_file denies guessing non-existent files (Ghost Path Guard)', () => {
      const res = evaluatePayload({
        toolCall: {
          name: 'view_file',
          args: {
            AbsolutePath:
              '/home/watter46/src/footics/.agents/hooks/guard/token-rewriter.ts',
          },
        },
      });
      expect(res.decision).toBe('deny');
      expect(res.reason).toContain('File not found');
      expect(res.reason).toContain('Guessing file paths');
    });

    test('view_file transparently rewrites slicing for small files (<= 400 lines)', () => {
      // token-filter.ts is 354 lines (<= 400 lines)
      const resSliced = evaluatePayload({
        toolCall: {
          name: 'view_file',
          args: {
            AbsolutePath:
              '/home/watter46/src/footics/.agents/hooks/guard/token-filter.ts',
            StartLine: 1,
            EndLine: 60,
          },
        },
      });
      expect(resSliced.decision).toBe('allow');
      expect(resSliced.overwrite).toEqual({
        StartLine: 1,
        EndLine: 355,
      });

      // view_file without slice is allowed
      const resWhole = evaluatePayload({
        toolCall: {
          name: 'view_file',
          args: {
            AbsolutePath:
              '/home/watter46/src/footics/.agents/hooks/guard/token-filter.ts',
          },
        },
      });
      expect(resWhole.decision).toBe('allow');
    });

    test('view_file denies sequential slicing loop using transcriptPath', () => {
      const tmpTranscript = '/tmp/test-transcript-loop.jsonl';
      const tmpLargeFile = '/tmp/test-large-file-500.txt';
      const fs = require('fs');

      // Create a 500-line file (> 400 lines)
      fs.writeFileSync(
        tmpLargeFile,
        Array.from({ length: 500 }, (_, i) => `line ${i + 1}`).join('\n'),
      );

      // Simulate a previous slice view in transcript
      fs.writeFileSync(
        tmpTranscript,
        `${JSON.stringify({
          step_index: 10,
          tool_calls: [
            {
              name: 'view_file',
              args: {
                AbsolutePath: tmpLargeFile,
                StartLine: 1,
                EndLine: 50,
              },
            },
          ],
        })}\n`,
      );

      // Attempting another slice on the same file is denied
      const res = evaluatePayload({
        toolCall: {
          name: 'view_file',
          args: {
            AbsolutePath: tmpLargeFile,
            StartLine: 50,
            EndLine: 100,
          },
        },
        transcriptPath: tmpTranscript,
      });
      expect(res.decision).toBe('deny');
      expect(res.reason).toContain('Sequential slicing loop detected');

      try {
        fs.unlinkSync(tmpTranscript);
        fs.unlinkSync(tmpLargeFile);
      } catch (_e) {}
    });

    test('view_file handles quotes in arguments safely', () => {
      const res = evaluatePayload({
        toolCall: {
          name: 'view_file',
          args: {
            AbsolutePath:
              '"/home/watter46/src/footics/.agents/hooks/guard/token-filter.ts"',
            StartLine: '"1"',
            EndLine: '"60"',
          },
        },
      });
      expect(res.decision).toBe('allow');
      expect(res.overwrite).toEqual({
        StartLine: 1,
        EndLine: 355,
      });
    });
  });

  describe('3. Token Guard - Hard Denials (Token Explosion & Ad-hoc Scripts)', () => {
    test('denies ad-hoc scripts (python, node, ruby)', () => {
      expect(evaluateCommand('python -c "print(1)"').decision).toBe('deny');
      expect(evaluateCommand('node -e "console.log(1)"').decision).toBe('deny');
    });

    test('denies fd -H / --hidden', () => {
      const res1 = evaluateCommand('fd -H src');
      expect(res1.decision).toBe('deny');
      expect(res1.reason).toContain("'fd -H'");

      const res2 = evaluateCommand('fd --hidden pattern');
      expect(res2.decision).toBe('deny');
    });

    test('denies full JSON dumping with jq .', () => {
      const res = evaluateCommand('jq . package.json');
      expect(res.decision).toBe('deny');
      expect(res.reason).toContain("Full JSON dumping with 'jq .'");
    });

    test('denies git diff --stat', () => {
      const res = evaluateCommand('git diff --stat');
      expect(res.decision).toBe('deny');
      expect(res.reason).toContain('git diff --stat');
    });

    test('denies compressed rtk read on markdown / rules / config files', () => {
      const res1 = evaluateCommand('rtk read -m 10 README.md');
      expect(res1.decision).toBe('deny');
      expect(res1.reason).toContain(
        'forbidden for Markdown/config/rules files',
      );

      const res2 = evaluateCommand('rtk read --level aggressive AGENTS.md');
      expect(res2.decision).toBe('deny');
    });

    test('denies rtk smart on critical agent rules', () => {
      const res = evaluateCommand(
        'rtk smart .agents/rules/coding-standards.md',
      );
      expect(res.decision).toBe('deny');
    });

    test('enforces scope on ai:reviewer:check', () => {
      // pnpm runner
      expect(evaluateCommand('pnpm run ai:reviewer:check').decision).toBe(
        'deny',
      );
      expect(
        evaluateCommand('pnpm run ai:reviewer:check src/foo.ts').decision,
      ).toBe('allow');

      // bun runner
      expect(evaluateCommand('bun run ai:reviewer:check').decision).toBe(
        'deny',
      );
      expect(
        evaluateCommand('bun run ai:reviewer:check src/foo.ts').decision,
      ).toBe('allow');
    });
  });

  describe('4. Compound commands, pipes and redirects (regression)', () => {
    test('rewrites every sub-command and keeps the chain intact', () => {
      const res = evaluateCommand('git status && git log -n 3');
      expect(res.decision).toBe('allow');
      expect(res.overwrite?.CommandLine).toBe(
        'rtk git status && rtk git log -n 3',
      );
    });

    test('keeps non-rewritten parts of a chain', () => {
      const res = evaluateCommand('git add a.ts && ls src');
      expect(res.overwrite?.CommandLine).toBe('git add a.ts && rtk ls src');
    });

    test('does not rewrite stdin-consuming head/tail/grep after a pipe', () => {
      const res = evaluateCommand('bun run ./a.ts | tail -n 5');
      expect(res.overwrite).toBeUndefined();
      const res2 = evaluateCommand('ls src | grep foo');
      expect(res2.overwrite?.CommandLine).toBe('rtk ls src | grep foo');
    });

    test('does not split on redirects like 2>&1 and &>', () => {
      expect(splitCommands('ls 2>&1 && cat a')).toEqual(['ls 2>&1', 'cat a']);
      expect(splitCommands('x &> out.txt; y >&2')).toEqual([
        'x &> out.txt',
        'y >&2',
      ]);
      expect(evaluateCommand('ls src 2>&1').overwrite?.CommandLine).toBe(
        'rtk ls src 2>&1',
      );
    });
  });

  describe('5. Biome routing, lossy wrappers and ad-hoc bun', () => {
    test('biome gets compact flags instead of the ESLint-oriented rtk lint', () => {
      const res = evaluateCommand('bunx biome check src/a.ts');
      expect(res.overwrite?.CommandLine).toBe(
        `bunx biome check src/a.ts ${BIOME_FLAGS}`,
      );
    });

    test('biome keeps user-specified flags and ignores non-check commands', () => {
      expect(
        evaluateCommand('biome check . --reporter=json').overwrite?.CommandLine,
      ).toBe(
        'biome check . --reporter=json --diagnostic-level=error --max-diagnostics=20',
      );
      expect(evaluateCommand('biome check --help').overwrite).toBeUndefined();
      expect(evaluateCommand('biome --version').overwrite).toBeUndefined();
    });

    test('denies rtk test wrapping a non-test command (lossy last-lines filter)', () => {
      const res = evaluateCommand('rtk test "bun -e \\"console.log(1)\\""');
      expect(res.decision).toBe('deny');
      expect(res.reason).toContain('lossy');
    });

    test('allows rtk test wrapping real test runners', () => {
      expect(evaluateCommand('rtk test "bun test ./a.test.ts"').decision).toBe(
        'allow',
      );
      expect(
        evaluateCommand('rtk test "vitest run src/a.test.ts"').decision,
      ).toBe('allow');
    });

    test('denies bun -e / bun --eval ad-hoc scripts like node -e', () => {
      const res = evaluateCommand('bun -e "console.log(1)"');
      expect(res.decision).toBe('deny');
      expect(res.reason).toContain('ai:report');
      expect(evaluateCommand('bun --eval "1"').decision).toBe('deny');
      expect(evaluateCommand('bun test ./a.test.ts').decision).toBe('allow');
      expect(evaluateCommand('bun run ai:preflight').decision).toBe('allow');
    });
  });

  describe('6. Agent Access Guard - Role-based file write restrictions', () => {
    const fs = require('fs');

    function makeTranscript(file: string, firstLineObj: any) {
      fs.writeFileSync(file, `${JSON.stringify(firstLineObj)}\n`);
    }

    test('Planner (parent session starting with USER_INPUT) can write tasks and .agents but not source code', () => {
      const transcript = '/tmp/test-planner-access.jsonl';
      makeTranscript(transcript, {
        step_index: 0,
        type: 'USER_INPUT',
        content: 'hello',
      });

      // tasks/** is allowed
      expect(
        evaluatePayload({
          toolCall: {
            name: 'write_to_file',
            args: { TargetFile: 'tasks/TASK-003.md' },
          },
          transcriptPath: transcript,
        }).decision,
      ).toBe('allow');

      // .agents/** is allowed
      expect(
        evaluatePayload({
          toolCall: {
            name: 'write_to_file',
            args: { TargetFile: '.agents/hooks/guard/agent-access-guard.ts' },
          },
          transcriptPath: transcript,
        }).decision,
      ).toBe('allow');

      // src/** is denied
      const resSrc = evaluatePayload({
        toolCall: {
          name: 'replace_file_content',
          args: { TargetFile: 'src/features/foo.ts' },
        },
        transcriptPath: transcript,
      });
      expect(resSrc.decision).toBe('deny');
      expect(resSrc.reason).toContain('Planner is prohibited');

      // extension/** is denied
      const resExt = evaluatePayload({
        toolCall: {
          name: 'write_to_file',
          args: { TargetFile: 'extension/src/content.ts' },
        },
        transcriptPath: transcript,
      });
      expect(resExt.decision).toBe('deny');

      // tests/** is denied
      const resTest = evaluatePayload({
        toolCall: {
          name: 'write_to_file',
          args: { TargetFile: 'tests/unit/foo.test.ts' },
        },
        transcriptPath: transcript,
      });
      expect(resTest.decision).toBe('deny');

      try {
        fs.unlinkSync(transcript);
      } catch (_e) {}
    });

    test('Reviewer (starting with REVIEW_REQUEST) can only write tasks/**', () => {
      const transcript = '/tmp/test-reviewer-access.jsonl';
      makeTranscript(transcript, {
        step_index: 0,
        type: 'SYSTEM_MESSAGE',
        content: 'type: "REVIEW_REQUEST"\ntarget_file: "tasks/TASK-001.md"',
      });

      // tasks/** is allowed
      expect(
        evaluatePayload({
          toolCall: {
            name: 'write_to_file',
            args: { TargetFile: 'tasks/TASK-001.md' },
          },
          transcriptPath: transcript,
        }).decision,
      ).toBe('allow');

      // src/** is denied
      const resSrc = evaluatePayload({
        toolCall: {
          name: 'replace_file_content',
          args: { TargetFile: 'src/features/foo.ts' },
        },
        transcriptPath: transcript,
      });
      expect(resSrc.decision).toBe('deny');
      expect(resSrc.reason).toContain('Reviewer is prohibited');

      // .agents/** is denied
      const resAgents = evaluatePayload({
        toolCall: {
          name: 'write_to_file',
          args: { TargetFile: '.agents/rules/foo.md' },
        },
        transcriptPath: transcript,
      });
      expect(resAgents.decision).toBe('deny');

      try {
        fs.unlinkSync(transcript);
      } catch (_e) {}
    });

    test('Worker (starting with TASK_ASSIGN) can write src, extension, tests, tasks but not .agents or package.json', () => {
      const transcript = '/tmp/test-worker-access.jsonl';
      makeTranscript(transcript, {
        step_index: 0,
        type: 'SYSTEM_MESSAGE',
        content: 'type: "TASK_ASSIGN"\ntarget_file: "tasks/TASK-001.md"',
      });

      // src/** allowed
      expect(
        evaluatePayload({
          toolCall: {
            name: 'write_to_file',
            args: { TargetFile: 'src/foo.ts' },
          },
          transcriptPath: transcript,
        }).decision,
      ).toBe('allow');

      // extension/** allowed
      expect(
        evaluatePayload({
          toolCall: {
            name: 'write_to_file',
            args: { TargetFile: 'extension/foo.ts' },
          },
          transcriptPath: transcript,
        }).decision,
      ).toBe('allow');

      // tests/** allowed
      expect(
        evaluatePayload({
          toolCall: {
            name: 'write_to_file',
            args: { TargetFile: 'tests/foo.test.ts' },
          },
          transcriptPath: transcript,
        }).decision,
      ).toBe('allow');

      // tasks/** allowed
      expect(
        evaluatePayload({
          toolCall: {
            name: 'replace_file_content',
            args: { TargetFile: 'tasks/TASK-001.md' },
          },
          transcriptPath: transcript,
        }).decision,
      ).toBe('allow');

      // .agents/** denied
      const resAgents = evaluatePayload({
        toolCall: {
          name: 'write_to_file',
          args: { TargetFile: '.agents/rules/foo.md' },
        },
        transcriptPath: transcript,
      });
      expect(resAgents.decision).toBe('deny');
      expect(resAgents.reason).toContain('modifying agent definitions');

      // package.json denied
      const resPkg = evaluatePayload({
        toolCall: {
          name: 'replace_file_content',
          args: { TargetFile: 'package.json' },
        },
        transcriptPath: transcript,
      });
      expect(resPkg.decision).toBe('deny');
      expect(resPkg.reason).toContain('explicit user confirmation');

      try {
        fs.unlinkSync(transcript);
      } catch (_e) {}
    });

    test('Auditor (starting with AUDIT_REQUEST) denies raw transcript reads and unauthorized commands, but allows bun run ai:audit', () => {
      const transcript = '/tmp/test-auditor-access.jsonl';
      makeTranscript(transcript, {
        step_index: 0,
        type: 'SYSTEM_MESSAGE',
        content: 'type: "AUDIT_REQUEST"\nsession: "c2ed8fa3"',
      });

      // 1. read_file on transcript.jsonl is denied
      const resRead = evaluatePayload({
        toolCall: {
          name: 'read_file',
          args: {
            Path: '/home/watter46/.gemini/antigravity-cli/brain/c2ed8fa3/.system_generated/logs/transcript.jsonl',
          },
        },
        transcriptPath: transcript,
      });
      expect(resRead.decision).toBe('deny');
      expect(resRead.reason).toContain('direct transcript');

      // 2. cat on transcript.jsonl is denied
      const resCat = evaluatePayload({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'cat /path/to/transcript.jsonl' },
        },
        transcriptPath: transcript,
      });
      expect(resCat.decision).toBe('deny');

      // 3. Prohibited executable (python) is denied
      const resPy = evaluatePayload({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'python3 -c "1"' },
        },
        transcriptPath: transcript,
      });
      expect(resPy.decision).toBe('deny');

      // 4. Allowed bun run ai:audit
      const resAudit = evaluatePayload({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'bun run ai:audit c2ed8fa3' },
        },
        transcriptPath: transcript,
      });
      expect(resAudit.decision).toBe('allow');

      // 5. Any write tool is denied
      const resWrite = evaluatePayload({
        toolCall: {
          name: 'write_file',
          args: { Path: 'tasks/TASK-001.md' },
        },
        transcriptPath: transcript,
      });
      expect(resWrite.decision).toBe('deny');
      expect(resWrite.reason).toContain('Auditor is a read-only audit agent');

      // 6. Subagent invocation is denied
      const resInvoke = evaluatePayload({
        toolCall: {
          name: 'invoke_subagent',
          args: { TypeName: 'worker', Role: 'Worker', Prompt: 'Do it' },
        },
        transcriptPath: transcript,
      });
      expect(resInvoke.decision).toBe('deny');
      expect(resInvoke.reason).toContain('prohibited from spawning subagents');

      try {
        fs.unlinkSync(transcript);
      } catch (_e) {}
    });
  });
});
