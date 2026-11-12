import { describe, expect, it } from 'bun:test';
import { extractOutlineFromSource } from '../outline';

describe('outline.ts (ai:outline)', () => {
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

    const out = extractOutlineFromSource('src/sample.tsx', sample);

    // 1. Line count & header
    expect(out).toContain('=== src/sample.tsx (25 lines) ===');

    // 2. Internal imports only (excludes 'react')
    expect(out).toContain("from '@/lib/types/tactical': type { Slide }");
    expect(out).toContain("from './helper': { helper }");
    expect(out).not.toContain("from 'react'");

    // 3. Line ranges on declarations
    expect(out).toContain('[L5-L8] export interface PlayerProps');
    expect(out).toContain(
      '[L10-L14] export function calculatePos(x: number, y: number): { x: number; y: number };',
    );

    // 4. Function bodies and JSX inside memo/arrow functions are stripped
    expect(out).toContain(
      '[L16-L20] export const PlayerNode = memo((props: PlayerProps) => { ... });',
    );
    expect(out).not.toContain('secretBodyLine1');
    expect(out).toContain(
      '[L22-L25] export const useCustomHook = (slide: Slide): number => { ... };',
    );
    expect(out).not.toContain('const inner = helper');
  });
});
