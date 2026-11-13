import { describe, expect, it } from 'vitest';
import {
  clampToScreenNorm,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  BenchPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type {
  DomainSlide,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import { applyTacticalCommand } from '../domain/project-reducer';
import { applySlideCommand } from '../domain/slide-reducer';

const style = {
  markerType: 'circle',
  insideContent: 'number',
  bottomLabel: 'name',
  color: '#ff0000',
  strokeColor: '#ffffff',
  strokeWidth: 2,
  sizeScale: 1.0,
  numberSizeScale: 1.0,
  labelSizeScale: 1.0,
} as const;

const pitch = (
  id: string,
  x: number,
  y: number,
  overrides?: Partial<PitchPlayer>,
): PitchPlayer => ({
  id,
  area: 'pitch',
  team: 'home',
  x: clampToScreenNorm(x),
  y: clampToScreenNorm(y),
  style,
  connectLines: [],
  badges: [],
  ...overrides,
});

const bench = (id: string, x: number, y: number): BenchPlayer => ({
  id,
  area: 'bench',
  team: 'home',
  x: clampToScreenNorm(x),
  y: clampToScreenNorm(y),
  style,
});

const slide = (overrides?: Partial<DomainSlide>): DomainSlide => ({
  id: 's1',
  index: 0,
  players: [],
  arrows: [],
  zones: [],
  texts: [],
  ball: { x: clampToScreenNorm(50), y: clampToScreenNorm(50), visible: true },
  transitionDurationMs: 1000,
  pauseMs: 500,
  easing: 'linear',
  ...overrides,
});

const arrowFrom = (id: string, sourcePlayerId: string) => ({
  id,
  annotationType: 'arrow' as const,
  arrowType: 'pass' as const,
  curveType: 'straight' as const,
  points: [toScreenNormPoint(20, 30), toScreenNormPoint(80, 80)],
  color: '#ffffff',
  strokeWidth: 3,
  dashArray: [],
  startMarker: 'none' as const,
  endMarker: 'arrow' as const,
  sourcePlayerId,
});

describe('SWAP_PLAYERS', () => {
  it('ピッチ上の 2 選手は位置を交換する', () => {
    const base = slide({ players: [pitch('a', 20, 30), pitch('b', 60, 40)] });
    const next = applySlideCommand(base, {
      type: 'SWAP_PLAYERS',
      playerAId: 'a',
      playerBId: 'b',
    });
    expect(next.players.find((p) => p.id === 'a')?.x).toBe(60);
    expect(next.players.find((p) => p.id === 'b')?.x).toBe(20);
    expect(next.players.find((p) => p.id === 'b')?.y).toBe(30);
  });

  it('ピッチ↔ベンチは所属が入れ替わり、ベンチ側の座標が引き継がれる', () => {
    const base = slide({
      players: [
        pitch('a', 20, 30, {
          badges: [
            {
              id: 'b1',
              label: 'C',
              color: '#f59e0b',
              textColor: '#000000',
              offsetX: 0,
              offsetY: -12,
              visible: true,
            },
          ],
        }),
        bench('b', 5, 90),
      ],
      arrows: [arrowFrom('ar1', 'a')],
    });
    const next = applySlideCommand(base, {
      type: 'SWAP_PLAYERS',
      playerAId: 'a',
      playerBId: 'b',
    });
    const a = next.players.find((p) => p.id === 'a');
    const b = next.players.find((p) => p.id === 'b');
    expect(a?.area).toBe('bench');
    expect(a?.x).toBe(5);
    expect(a?.y).toBe(90);
    expect('badges' in (a ?? {})).toBe(false);
    expect(b?.area).toBe('pitch');
    expect(b?.x).toBe(20);
    expect(b?.y).toBe(30);
    expect(next.arrows).toHaveLength(0);
  });

  it('ロック中・不在・同一 ID の入れ替えは無視される', () => {
    const base = slide({
      players: [pitch('a', 20, 30, { locked: true }), pitch('b', 60, 40)],
    });
    for (const [x, y] of [
      ['a', 'b'],
      ['b', 'ghost'],
      ['b', 'b'],
    ]) {
      const next = applySlideCommand(base, {
        type: 'SWAP_PLAYERS',
        playerAId: x,
        playerBId: y,
      });
      expect(next.players).toEqual(base.players);
    }
  });
});

describe('CLEAR_PITCH_PLAYERS', () => {
  it('ピッチ上の選手を全員ベンチへ戻し、矢印を消す（ロック中の選手は残る）', () => {
    const base = slide({
      players: [
        pitch('a', 20, 30),
        pitch('locked', 40, 40, { locked: true }),
        bench('c', 5, 90),
      ],
      arrows: [arrowFrom('ar1', 'a')],
    });
    const next = applySlideCommand(base, { type: 'CLEAR_PITCH_PLAYERS' });
    expect(next.players.find((p) => p.id === 'a')?.area).toBe('bench');
    expect(next.players.find((p) => p.id === 'locked')?.area).toBe('pitch');
    expect(next.players.find((p) => p.id === 'c')?.area).toBe('bench');
    expect(next.arrows).toHaveLength(0);
  });
});

describe('REPLACE_PLAYERS', () => {
  it('選手リストを置換する（ロック中の選手は元の状態で残る）', () => {
    const base = slide({
      players: [pitch('old', 20, 30), pitch('keep', 50, 50, { locked: true })],
    });
    const next = applySlideCommand(base, {
      type: 'REPLACE_PLAYERS',
      players: [pitch('new', 70, 70)],
    });
    expect(next.players.map((p) => p.id).sort()).toEqual(['keep', 'new']);
  });
});

const projectWith = (slides: DomainSlide[][]): DomainTacticalProject => ({
  id: 'proj-1',
  version: '3.0.0',
  title: 'Test Project',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  homeColor: { primary: '#034694' },
  awayColor: { primary: '#ef4444' },
  pitchAppearance: {
    pitchBackgroundType: 'solid',
    overlayColor: '#0B303E',
    overlayOpacity: 1.0,
    lineColor: '#ffffff',
    lineWidth: 2.5,
    lineOpacity: 1.0,
  },
  screenBackground: { type: 'cinematic' },
  tags: [],
  phases: slides.map((list, i) => ({
    id: `ph${i}`,
    name: `Phase ${i}`,
    aspectRatio: '4:5',
    boundaryBox: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    },
    backgroundType: 'pitch',
    slides: list,
  })),
});

describe('UPDATE_ALL_SLIDE_TRANSITIONS', () => {
  it('全フェーズ・全スライドへ同じ遷移設定を適用する', () => {
    const project = projectWith([
      [slide({ id: 'a' }), slide({ id: 'b', index: 1 })],
      [slide({ id: 'c' })],
    ]);
    const next = applyTacticalCommand(project, {
      type: 'UPDATE_ALL_SLIDE_TRANSITIONS',
      patch: { transitionDurationMs: 2500, easing: 'ease-in-out' },
    });
    const all = next.phases.flatMap((p) => p.slides);
    expect(all).toHaveLength(3);
    for (const s of all) {
      expect(s.transitionDurationMs).toBe(2500);
      expect(s.easing).toBe('ease-in-out');
      expect(s.pauseMs).toBe(500);
    }
    expect(next.updatedAt).not.toBe(project.updatedAt);
  });
});
