import { afterEach, describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import ts from 'typescript';
import {
  findEnclosingContext,
  formatReadOutput,
  parseReadCliArgs,
} from '../read';

describe('read.ts (ai:read)', () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function setupFixture(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'read-test-'));
    tmpDirs.push(root);

    fs.mkdirSync(path.join(root, 'src'), { recursive: true });

    fs.writeFileSync(
      path.join(root, 'src/math.ts'),
      [
        'export interface Vec2 {',
        '  x: number;',
        '  y: number;',
        '}',
        '',
        'export function addVec(a: Vec2, b: Vec2): Vec2 {',
        '  return {',
        '    x: a.x + b.x,',
        '    y: a.y + b.y,',
        '  };',
        '}',
        '',
        'export const scaleVec = (v: Vec2, k: number): Vec2 => ({',
        '  x: v.x * k,',
        '  y: v.y * k,',
        '});',
      ].join('\n'),
    );

    fs.writeFileSync(
      path.join(root, 'src/store.ts'),
      [
        'export const createBoardSlice = (set: any) => ({',
        '  zoom: 1,',
        '  setZoom: (nextZoom: number) => {',
        '    const clamped = Math.max(0.5, Math.min(2, nextZoom));',
        '    set({ zoom: clamped });',
        '  },',
        '  resetBoard() {',
        '    set({ zoom: 1 });',
        '  },',
        '});',
      ].join('\n'),
    );

    return root;
  }

  it('extracts multiple symbols and explicit ranges across files in parallel with raw code', async () => {
    const root = setupFixture();
    const requests = parseReadCliArgs(
      ['src/math.ts:Vec2,scaleVec', 'src/store.ts:1-2'],
      root,
    );

    const output = await formatReadOutput(requests, { cwd: root });

    expect(output).toContain('=== src/math.ts [L1-L4] (Vec2) ===');
    expect(output).toContain(
      'export interface Vec2 {\n  x: number;\n  y: number;\n}',
    );
    expect(output).toContain('=== src/math.ts [L13-L16] (scaleVec) ===');
    expect(output).toContain(
      'export const scaleVec = (v: Vec2, k: number): Vec2 => ({',
    );
    expect(output).toContain('=== src/store.ts [L1-L2] ===');
    expect(output).toContain(
      'export const createBoardSlice = (set: any) => ({\n  zoom: 1,',
    );
  });

  it('supports common --symbol option across multiple files and tolerates partial NOT FOUND', async () => {
    const root = setupFixture();
    const requests = parseReadCliArgs(
      ['src/math.ts', 'src/store.ts', '--symbol', 'addVec,setZoom'],
      root,
    );

    const output = await formatReadOutput(requests, { cwd: root });

    expect(output).toContain('=== src/math.ts [L6-L11] (addVec) ===');
    expect(output).toContain('=== src/math.ts [NOT FOUND: setZoom] ===');
    expect(output).toContain('=== src/store.ts [NOT FOUND: addVec] ===');
    expect(output).toContain('=== src/store.ts [L3-L6] (setZoom) ===');
    expect(output).toContain('  setZoom: (nextZoom: number) => {');
  });

  it('recursively resolves nested AST symbols (Zustand actions and object methods)', async () => {
    const root = setupFixture();
    const requests = parseReadCliArgs(
      ['src/store.ts:setZoom,resetBoard'],
      root,
    );

    const output = await formatReadOutput(requests, { cwd: root });

    expect(output).toContain('=== src/store.ts [L3-L6] (setZoom) ===');
    expect(output).toContain(
      'const clamped = Math.max(0.5, Math.min(2, nextZoom));',
    );
    expect(output).toContain('=== src/store.ts [L7-L9] (resetBoard) ===');
    expect(output).toContain('  resetBoard() {\n    set({ zoom: 1 });\n  },');
  });

  it('automatically extracts the smallest enclosing AST node when given a single line number', async () => {
    const root = setupFixture();
    const requests = parseReadCliArgs(
      ['src/math.ts:8', 'src/store.ts:@4'],
      root,
    );

    const output = await formatReadOutput(requests, { cwd: root });

    // Line 8 in math.ts is inside addVec [L6-L11]
    expect(output).toContain('=== src/math.ts [L6-L11] (addVec @L8) ===');
    expect(output).toContain(
      'export function addVec(a: Vec2, b: Vec2): Vec2 {',
    );

    // Line 4 in store.ts is inside setZoom [L3-L6]
    expect(output).toContain('=== src/store.ts [L3-L6] (setZoom @L4) ===');
    expect(output).toContain('  setZoom: (nextZoom: number) => {');
  });

  it('truncates output gracefully when maxLines budget is exceeded', async () => {
    const root = setupFixture();
    const requests = parseReadCliArgs(['src/math.ts:addVec'], root);

    const output = await formatReadOutput(requests, { cwd: root, maxLines: 3 });

    expect(output).toContain('=== src/math.ts [L6-L11] (addVec) ===');
    expect(output).toContain('... [Truncated: 3 more lines]');
  });

  it('findEnclosingContext identifies enclosing function and test blocks', () => {
    const code = [
      "describe('suite', () => {",
      "  it('calculates value', () => {",
      '    const x = 1 + 2;',
      '    expect(x).toBe(3);',
      '  });',
      '});',
    ].join('\n');
    const sf = ts.createSourceFile(
      'sample.test.ts',
      code,
      ts.ScriptTarget.Latest,
      true,
    );
    const ctx = findEnclosingContext(sf, 3);
    expect(ctx).toEqual({
      name: "it('calculates value')",
      start: 2,
      end: 5,
      label: '[L2-L5]',
    });
  });

  it('findEnclosingContext recognizes multi-line useEffect, return, and destructured declarations instead of falling back to parent component', () => {
    const code = [
      'export function BigComponent() {',
      '  const { alpha, beta } = useMemo(() => {',
      '    return { alpha: 1, beta: 2 };',
      '  }, []);',
      '  useEffect(() => {',
      '    console.log(alpha, beta);',
      '  }, [alpha, beta]);',
      '  return (',
      '    <div>',
      '      <span>{alpha}</span>',
      '      <span>{beta}</span>',
      '    </div>',
      '  );',
      '}',
    ].join('\n');
    const sf = ts.createSourceFile(
      'BigComponent.tsx',
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    expect(findEnclosingContext(sf, 3)).toEqual({
      name: '{ alpha, beta }',
      start: 2,
      end: 4,
      label: '[L2-L4]',
    });
    expect(findEnclosingContext(sf, 6)).toEqual({
      name: 'useEffect',
      start: 5,
      end: 7,
      label: '[L5-L7]',
    });
    expect(findEnclosingContext(sf, 10)).toEqual({
      name: 'return',
      start: 8,
      end: 13,
      label: '[L8-L13]',
    });
  });

  it('auto-degrades to inner member structure when a large parent symbol exceeds maxSingleSymbolLines', async () => {
    const root = setupFixture();
    const bigLines = [
      'export function HugeHook() {',
      '  const handleA = useCallback(() => {',
      '    return 1;',
      '  }, []);',
      '  const handleB = useCallback(() => {',
      '    return 2;',
      '  }, []);',
      ...Array.from({ length: 30 }, (_, i) => `  const v${i} = ${i};`),
      '  return { handleA, handleB };',
      '}',
    ].join('\n');
    fs.writeFileSync(path.join(root, 'src/huge.ts'), bigLines);

    const requests = parseReadCliArgs(['src/huge.ts:HugeHook'], root);
    const out = await formatReadOutput(requests, {
      cwd: root,
      maxSingleSymbolLines: 25,
    });

    expect(out).toContain('Auto-Peek Structure');
    expect(out).toContain('[L2-L4] handleA (useCallback)');
    expect(out).toContain('[L5-L7] handleB (useCallback)');
    expect(out).not.toContain('const v25 = 25;');
  });
});
