import { describe, expect, test } from 'bun:test';
import { evaluateCommand } from './guard';

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

    test('rewrites tsc, biome, vitest, next, playwright to rtk', () => {
      expect(evaluateCommand('tsc').overwrite?.CommandLine).toBe('rtk tsc');
      expect(evaluateCommand('biome check .').overwrite?.CommandLine).toBe(
        'rtk lint check .',
      );
      expect(evaluateCommand('vitest run').overwrite?.CommandLine).toBe(
        'rtk vitest run',
      );
      expect(evaluateCommand('next build').overwrite?.CommandLine).toBe(
        'rtk next build',
      );
      expect(evaluateCommand('playwright test').overwrite?.CommandLine).toBe(
        'rtk playwright test',
      );
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

    test('enforces scope on agent:check-worker and agent:check-reviewer', () => {
      expect(evaluateCommand('pnpm run agent:check-worker').decision).toBe(
        'deny',
      );
      expect(
        evaluateCommand('pnpm run agent:check-worker src/foo.ts').decision,
      ).toBe('allow');
      expect(evaluateCommand('pnpm run agent:check-reviewer').decision).toBe(
        'deny',
      );
      expect(
        evaluateCommand('pnpm run agent:check-reviewer src/foo.ts').decision,
      ).toBe('allow');
    });
  });
});
