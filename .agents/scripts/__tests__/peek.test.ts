import { afterEach, describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  extractPeekFromSource,
  formatPeekOutput,
  MAX_PEEK_OUTPUT_LINES,
} from '../peek';

describe('peek.ts (ai:peek)', () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('extracts line numbers, internal imports, types, and folds arrow/memo function bodies', () => {
    const sample = [
      "import { memo } from 'react';",
      "import type { Slide } from '@/lib/types/tactical';",
      "import { helper } from './helper';",
      '',
      'export interface PlayerProps {',
      '  id: string;',
      '  x: number;',
      '}',
      '',
      'export function calculatePos(x: number, y: number): { x: number; y: number } {',
      '  const a = x + 1;',
      '  const b = y + 2;',
      '  return { x: a, y: b };',
      '}',
      '',
      'export const PlayerNode = memo((props: PlayerProps) => {',
      '  const secretBodyLine1 = 1;',
      '  const secretBodyLine2 = 2;',
      '  return <div>{props.id}</div>;',
      '});',
      '',
      'export const useCustomHook = (slide: Slide): number => {',
      '  const inner = helper(slide);',
      '  return inner;',
      '};',
    ].join('\n');

    const out = extractPeekFromSource('src/sample.tsx', sample);

    expect(out).toContain('=== src/sample.tsx (25 lines) ===');
    expect(out).toContain("from '@/lib/types/tactical': type { Slide }");
    expect(out).toContain("from './helper': { helper }");
    expect(out).not.toContain("from 'react'");
    expect(out).toContain('[L5-L8] export interface PlayerProps');
    expect(out).toContain(
      '[L10-L14] export function calculatePos(x: number, y: number): { x: number; y: number };',
    );
    expect(out).toContain(
      '[L16-L20] export const PlayerNode = memo((props: PlayerProps) => { ... });',
    );
    expect(out).not.toContain('secretBodyLine1');
    expect(out).toContain(
      '[L22-L25] export const useCustomHook = (slide: Slide): number => { ... };',
    );
    expect(out).not.toContain('const inner = helper');
  });

  it('extracts nested describe/it/test hierarchy with line ranges from test files', () => {
    const testSrc = [
      "import { describe, expect, it, test } from 'vitest';",
      "import { calc } from '../calc';",
      '',
      "describe('Calculator', () => {",
      "  describe('add', () => {",
      "    it('adds two positive numbers', () => {",
      '      expect(calc(1, 2)).toBe(3);',
      '    });',
      '  });',
      "  test('handles zero', () => {",
      '    expect(calc(0, 0)).toBe(0);',
      '  });',
      '});',
    ].join('\n');

    const out = extractPeekFromSource('src/__tests__/calc.test.ts', testSrc);

    expect(out).toContain("from '../calc': { calc }");
    expect(out).toContain('[L4-L13] describe("Calculator")');
    expect(out).toContain('  [L5-L9] describe("add")');
    expect(out).toContain('    [L6-L8] it("adds two positive numbers")');
    expect(out).toContain('  [L10-L12] test("handles zero")');
  });

  it('extracts a single symbol declaration body and reports missing symbols', () => {
    const src = [
      'export const first = 1;',
      '',
      'export function targetFn(n: number): number {',
      '  const doubled = n * 2;',
      '  return doubled;',
      '}',
      '',
      'export const last = 2;',
    ].join('\n');

    const hit = extractPeekFromSource('src/mod.ts', src, {
      symbol: 'targetFn',
    });
    expect(hit).toContain('=== src/mod.ts:targetFn [L3-L6] ===');
    expect(hit).toContain('4:   const doubled = n * 2;');
    expect(hit).not.toContain('first = 1');
    expect(hit).not.toContain('last = 2');

    const miss = extractPeekFromSource('src/mod.ts', src, {
      symbol: 'missingFn',
    });
    expect(miss).toContain('[Not found: missingFn]');
  });

  it('degrades to per-file summary when total output exceeds 250 lines', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'peek-cap-'));
    tmpDirs.push(dir);

    const files: string[] = [];
    for (let f = 0; f < 10; f++) {
      const p = path.join(dir, `mod-${f}.ts`);
      const body = Array.from(
        { length: 30 },
        (_, i) => `export function fn_${f}_${i}(): number {\n  return ${i};\n}`,
      ).join('\n');
      fs.writeFileSync(p, body);
      files.push(p);
    }

    const out = formatPeekOutput(files, { cwd: dir });
    expect(out).toContain(`> ${MAX_PEEK_OUTPUT_LINES}`);
    expect(out).toContain('=== mod-0.ts (90 lines) | symbols:');
    expect(out).toContain('=== mod-9.ts (90 lines) | symbols:');
    expect(out.split('\n').length).toBeLessThan(40);
  });

  it('expands 1st-level inner handlers, useEffect, and return for >=25-line components/hooks', () => {
    const bigComponent = [
      "import { memo, useCallback, useEffect } from 'react';",
      '',
      'export const BigBoard = memo(({ id }: { id: string }) => {',
      '  const handleDragStart = useCallback(() => {',
      '    console.log("start", id);',
      '    return true;',
      '  }, [id]);',
      '',
      '  const handleDragEnd = useCallback(() => {',
      '    console.log("end", id);',
      '    return false;',
      '  }, [id]);',
      '',
      '  useEffect(() => {',
      '    console.log("mounted", id);',
      '  }, [id]);',
      '',
      '  // filler lines to exceed 25 lines',
      '  const a1 = 1;',
      '  const a2 = 2;',
      '  const a3 = 3;',
      '  const a4 = 4;',
      '  const a5 = 5;',
      '',
      '  return (',
      '    <div>',
      '      <span>{id}</span>',
      '      <button onClick={handleDragStart}>Start</button>',
      '    </div>',
      '  );',
      '});',
    ].join('\n');

    const out = extractPeekFromSource('src/BigBoard.tsx', bigComponent);
    expect(out).toContain('[L4-L7] handleDragStart (useCallback)');
    expect(out).toContain('[L9-L12] handleDragEnd (useCallback)');
    expect(out).toContain('[L14-L16] useEffect()');
    expect(out).toContain('[L25-L30] return');
  });
});
