import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  defaultExtractHead,
  formatVerdict,
  runStep,
  skippedStep,
} from '../lib/run-step';
import {
  biomeHead,
  biomeSummary,
  bunTestSummary,
  classify,
  findBunTests,
  parsePorcelain,
  vitestSummary,
} from '../preflight';

let root: string;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-'));
  const mk = (p: string) => {
    fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
    fs.writeFileSync(path.join(root, p), '');
  };
  mk('.agents/hooks/guard.ts');
  mk('.agents/hooks/guard.test.ts');
  mk('.agents/hooks/guard/token-filter.ts');
  mk('.agents/scripts/preflight.ts');
  mk('.agents/scripts/__tests__/preflight.test.ts');
  mk('scripts/verify/scoped-check.ts');
});

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe('parsePorcelain', () => {
  test('extracts modified, untracked and renamed paths; skips deletions', () => {
    const text = [
      ' M .agents/hooks/guard.ts',
      '?? notes/a.md',
      'R  old.ts -> src/new.ts',
      ' D gone.ts',
      '',
    ].join('\n');
    expect(parsePorcelain(text)).toEqual([
      '.agents/hooks/guard.ts',
      'notes/a.md',
      'src/new.ts',
    ]);
  });
});

describe('findBunTests / classify', () => {
  test('nested guard file maps to nearest tests (hooks dir)', () => {
    expect(findBunTests('.agents/hooks/guard/token-filter.ts', root)).toEqual([
      '.agents/hooks/guard.test.ts',
    ]);
  });

  test('test file maps to itself', () => {
    expect(findBunTests('.agents/hooks/guard.test.ts', root)).toEqual([
      '.agents/hooks/guard.test.ts',
    ]);
  });

  test('routes by runner: .agents -> bun test, src -> vitest, md -> neither', () => {
    const plan = classify(
      [
        '.agents/hooks/guard.ts',
        '.agents/scripts/preflight.ts',
        'src/lib/a.ts',
        'notes/x.md',
        'src/types/g.d.ts',
      ],
      root,
    );
    expect(plan.bunTests).toEqual([
      './.agents/hooks/guard.test.ts',
      './.agents/scripts/__tests__/preflight.test.ts',
    ]);
    expect(plan.vitest).toEqual(['src/lib/a.ts', 'src/types/g.d.ts']);
    expect(plan.tsc).toEqual(['src/lib/a.ts']);
    expect(plan.biome).not.toContain('notes/x.md');
  });
});

describe('summaries', () => {
  const biomeOut =
    'experimental\n{"summary":{"errors":1,"warnings":7},"diagnostics":[{"severity":"error","message":"Format","category":"format","location":{"path":"a.ts","start":{"line":3,"column":1}}},{"severity":"warning","message":"w","category":"lint/x","location":{"path":"b.ts"}}]}\n';

  test('biomeSummary counts errors/warnings', () => {
    expect(biomeSummary(biomeOut)).toBe('1e/7w');
  });

  test('biomeHead shows only errors with file:line:col', () => {
    expect(biomeHead(biomeOut, 20)).toEqual(['a.ts:3:1 format Format']);
  });

  test('bun test / vitest summaries', () => {
    expect(bunTestSummary(' 24 pass\n 0 fail')).toBe('24✓');
    expect(vitestSummary(' Tests  41 passed (41)')).toBe('41✓');
    expect(vitestSummary('No test files found')).toBe('0(no related)');
  });
});

describe('runStep / formatVerdict', () => {
  test('success returns summary only and tees full log', () => {
    const r = runStep('t-ok', ['node', '-e', 'console.log("hello")'], {
      logDir: path.join(root, 'logs'),
    });
    expect(r.ok).toBe(true);
    expect(r.head).toEqual([]);
    expect(fs.readFileSync(r.logPath, 'utf8')).toContain('hello');
  });

  test('failure returns head lines and exit code', () => {
    const r = runStep(
      't-fail',
      ['node', '-e', 'console.error("src/a.ts:3 error boom");process.exit(2)'],
      { logDir: path.join(root, 'logs') },
    );
    expect(r.ok).toBe(false);
    expect(r.summary).toBe('fail(exit 2)');
    expect(r.head[0]).toContain('src/a.ts:3 error boom');
  });

  test('defaultExtractHead dedupes and caps', () => {
    const out = Array.from({ length: 50 }, () => 'x.ts:1 error same').join(
      '\n',
    );
    expect(defaultExtractHead(out, 20)).toEqual(['x.ts:1 error same']);
  });

  test('formatVerdict: one line when all ok, includes details on failure', () => {
    const ok = formatVerdict([skippedStep('tsc', 'no ts')], 'files=1');
    expect(ok.split('\n').length).toBe(1);
    expect(ok).toContain('PREFLIGHT ok');
    const ng = formatVerdict(
      [
        {
          name: 'biome',
          ok: false,
          skipped: false,
          summary: '1e/0w',
          head: ['a.ts:1:1 format F'],
          logPath: '/l.log',
        },
      ],
      'files=1',
    );
    expect(ng).toContain('PREFLIGHT FAIL');
    expect(ng).toContain('[biome] a.ts:1:1 format F');
    expect(ng).toContain('full log: /l.log');
  });
});
