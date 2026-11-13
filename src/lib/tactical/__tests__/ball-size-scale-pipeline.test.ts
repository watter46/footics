import { describe, expect, it } from 'vitest';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { normalizeBall } from '../acl/annotation-normalizers';
import { compileBillboardItems } from '../compiler/compile-billboards';
import { interpolateSlide } from '../engine/slide-interpolator';
import { evaluateStaticSlideFrame } from '../engine/timeline-evaluator';

const slideWith = (sizeScale?: number): DomainSlide => ({
  id: 's',
  index: 0,
  players: [],
  arrows: [],
  zones: [],
  texts: [],
  ball: {
    x: clampToScreenNorm(50),
    y: clampToScreenNorm(50),
    visible: true,
    sizeScale,
  },
  transitionDurationMs: 1000,
  pauseMs: 500,
  easing: 'linear',
});

const viewport = { width: 1000, height: 1000 };

const ballRadius = (slide: DomainSlide): number => {
  const { billboardItems } = compileBillboardItems(
    evaluateStaticSlideFrame(slide),
    null,
    viewport,
  );
  const ball = billboardItems.find((i) => i.kind === 'ball');
  if (!ball || ball.kind !== 'ball') throw new Error('ball not found');
  return ball.radiusPx;
};

describe('normalizeBall', () => {
  it('sizeScale を 0.4〜2.0 に丸め、locked を保持する', () => {
    expect(normalizeBall({ x: 1, y: 2, sizeScale: 9 }).sizeScale).toBe(2.0);
    expect(normalizeBall({ x: 1, y: 2, sizeScale: 0 }).sizeScale).toBe(0.4);
    expect(normalizeBall({ x: 1, y: 2, locked: true }).locked).toBe(true);
    expect(normalizeBall({ x: 1, y: 2 }).sizeScale).toBeUndefined();
  });
});

describe('ボール半径のサイズ倍率反映', () => {
  it('倍率 2.0 は未指定の 2 倍の半径になる', () => {
    expect(ballRadius(slideWith(2.0))).toBeCloseTo(ballRadius(slideWith()) * 2);
  });
});

describe('interpolateSlide のボール倍率補間', () => {
  it('中間で倍率が線形補間され、両方未指定なら未指定のまま', () => {
    const mid = interpolateSlide(slideWith(1), slideWith(2), 0.5).slide.ball;
    expect(mid.sizeScale).toBeCloseTo(1.5);
    const none = interpolateSlide(slideWith(), slideWith(), 0.5).slide.ball;
    expect(none.sizeScale).toBeUndefined();
  });
});
