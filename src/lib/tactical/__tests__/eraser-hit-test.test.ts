import { describe, expect, it } from 'vitest';
import {
  clampToScreenNorm,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { findEraseTargetIds } from '../engine/eraser-hit-test';

const arrow = (id: string, locked?: boolean) => ({
  id,
  annotationType: 'arrow' as const,
  arrowType: 'pass' as const,
  curveType: 'straight' as const,
  points: [toScreenNormPoint(10, 10), toScreenNormPoint(50, 10)],
  color: '#ffffff',
  strokeWidth: 3,
  dashArray: [],
  startMarker: 'none' as const,
  endMarker: 'arrow' as const,
  locked,
});

const rectZone = (id: string) => ({
  id,
  annotationType: 'zone' as const,
  zoneType: 'generic' as const,
  shapeType: 'rect' as const,
  x: clampToScreenNorm(20),
  y: clampToScreenNorm(60),
  width: 10,
  height: 10,
  color: '#f59e0b',
  opacity: 0.25,
  strokeWidth: 3,
});

const text = (id: string) => ({
  id,
  annotationType: 'text' as const,
  x: clampToScreenNorm(80),
  y: clampToScreenNorm(80),
  content: 't',
  fontSize: 16,
  color: '#ffffff',
  bold: false,
  italic: false,
});

const slide: DomainSlide = {
  id: 's',
  index: 0,
  players: [],
  arrows: [arrow('ar1'), arrow('ar-locked', true)],
  zones: [rectZone('z1')],
  texts: [text('t1')],
  ball: { x: clampToScreenNorm(50), y: clampToScreenNorm(50), visible: true },
  transitionDurationMs: 1000,
  pauseMs: 500,
  easing: 'linear',
};

describe('findEraseTargetIds', () => {
  it('矢印の線分上（半径内）の矢印だけを返す。ロック中は除外', () => {
    expect(findEraseTargetIds(slide, { x: 30, y: 12 })).toEqual(['ar1']);
  });

  it('ゾーンの内側・テキスト近傍を返す', () => {
    expect(findEraseTargetIds(slide, { x: 25, y: 65 })).toEqual(['z1']);
    expect(findEraseTargetIds(slide, { x: 81, y: 81 })).toEqual(['t1']);
  });

  it('何にも当たらない点・半径 0 では空配列', () => {
    expect(findEraseTargetIds(slide, { x: 50, y: 95 })).toEqual([]);
    expect(findEraseTargetIds(slide, { x: 30, y: 12 }, 0)).toEqual([]);
  });
});
