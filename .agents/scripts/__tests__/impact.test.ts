import { afterEach, describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { analyzeImpact, formatImpactReport } from '../impact';

describe('impact.ts (ai:impact)', () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function setupFixture(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'impact-test-'));
    tmpDirs.push(root);

    fs.mkdirSync(path.join(root, 'src/core'), { recursive: true });
    fs.mkdirSync(path.join(root, 'src/ui'), { recursive: true });
    fs.mkdirSync(path.join(root, 'extension'), { recursive: true });
    fs.mkdirSync(path.join(root, 'tests'), { recursive: true });

    fs.writeFileSync(
      path.join(root, 'src/core/types.ts'),
      'export interface TacticalPoint {\n  x: number;\n  y: number;\n}\n',
    );
    fs.writeFileSync(
      path.join(root, 'src/core/calcPos.ts'),
      [
        "import type { TacticalPoint } from './types';",
        '',
        'export function computeTargetPos(pt: TacticalPoint): number {',
        '  return pt.x + pt.y;',
        '}',
      ].join('\n'),
    );
    fs.writeFileSync(
      path.join(root, 'src/ui/Board.tsx'),
      [
        "import { computeTargetPos } from '../core/calcPos';",
        '',
        'export function Board() {',
        '  const v = computeTargetPos({ x: 1, y: 2 });',
        '  const v2 = computeTargetPos({ x: 3, y: 4 });',
        '  const v3 = computeTargetPos({ x: 5, y: 6 });',
        '  return v + v2 + v3;',
        '}',
      ].join('\n'),
    );
    fs.writeFileSync(
      path.join(root, 'extension/Quick.tsx'),
      [
        "import { computeTargetPos } from '../src/core/calcPos';",
        'export const val = computeTargetPos({ x: 10, y: 20 });',
      ].join('\n'),
    );
    fs.writeFileSync(
      path.join(root, 'tests/calcPos.test.ts'),
      [
        "import { computeTargetPos } from '../src/core/calcPos';",
        "it('works', () => expect(computeTargetPos({ x: 1, y: 1 })).toBe(2));",
      ].join('\n'),
    );

    return root;
  }

  it('analyzes symbol impact: definitions, internal imports, consumers, and related tests', () => {
    const root = setupFixture();
    const report = analyzeImpact('computeTargetPos', { cwd: root });

    expect(report.mode).toBe('symbol');
    expect(report.definitions).toEqual([
      {
        file: 'src/core/calcPos.ts',
        range: '[L3-L5]',
        signature: 'function computeTargetPos(pt: TacticalPoint): number',
      },
    ]);
    expect(report.internalImports).toContain('./types: type { TacticalPoint }');
    expect(report.consumers.map((c) => c.file)).toEqual([
      'src/ui/Board.tsx',
      'extension/Quick.tsx',
    ]);
    expect(report.relatedTests).toEqual(['tests/calcPos.test.ts']);

    const formatted = formatImpactReport(report);
    expect(formatted).toContain('=== IMPACT (symbol): computeTargetPos ===');
    expect(formatted).toContain('src/core/calcPos.ts [L3-L5]');
    expect(formatted).toContain('tests/calcPos.test.ts');
  });

  it('analyzes file impact: exports, internal imports, consumers, and related tests', () => {
    const root = setupFixture();
    const report = analyzeImpact('src/core/calcPos.ts', { cwd: root });

    expect(report.mode).toBe('file');
    expect(report.definitions.length).toBe(1);
    expect(report.definitions[0].signature).toContain('computeTargetPos');
    expect(report.internalImports).toContain('./types: type { TacticalPoint }');
    expect(report.consumers.map((c) => c.file)).toContain('src/ui/Board.tsx');
    expect(report.consumers.map((c) => c.file)).toContain(
      'extension/Quick.tsx',
    );
    expect(report.relatedTests).toContain('tests/calcPos.test.ts');
  });

  it('caps consumer line excerpts at maxRefsPerFile while preserving totalMatches', () => {
    const root = setupFixture();
    const report = analyzeImpact('computeTargetPos', {
      cwd: root,
      maxRefsPerFile: 2,
    });

    const boardRef = report.consumers.find(
      (c) => c.file === 'src/ui/Board.tsx',
    );
    expect(boardRef).toBeDefined();
    expect(boardRef?.lines.length).toBe(2);
    expect(boardRef?.totalMatches).toBe(4);
  });
});
