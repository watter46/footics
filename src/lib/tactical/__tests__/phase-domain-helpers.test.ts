import { describe, expect, it } from 'vitest';
import {
  clampToScreenNorm,
  toScreenNormCoord,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type { PitchPlayer } from '@/lib/types/tactical/domain-entities';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import { transformSlideForAspect } from '../domain/aspect-transform';
import {
  applyImageBackgroundToPhase,
  isDefaultInitialSlide,
  restoreDefaultPitchInPhase,
} from '../domain/background-image';
import {
  computeAutoFitBoundaryBox,
  computeXMediaPresetBoundaryBox,
} from '../domain/boundary-box';

const baseStyle = {
  markerType: 'circle' as const,
  insideContent: 'number' as const,
  bottomLabel: 'name' as const,
  color: '#034694',
  strokeColor: '#ffffff',
  strokeWidth: 2,
  sizeScale: 1,
  numberSizeScale: 1,
  labelSizeScale: 1,
};

const makePlayer = (
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
  style: baseStyle,
  connectLines: [],
  badges: [],
  ...overrides,
});

const makeSlide = (overrides?: Partial<DomainSlide>): DomainSlide => ({
  id: 's1',
  index: 0,
  players: [],
  arrows: [],
  zones: [],
  texts: [],
  ball: { x: clampToScreenNorm(50), y: clampToScreenNorm(50), visible: true },
  transitionDurationMs: 1000,
  pauseMs: 500,
  easing: 'ease-in-out',
  ...overrides,
});

describe('transformSlideForAspect', () => {
  it('選手・ボールはクランプして変換し、矢印・テキストは画面外座標も維持する', () => {
    const slide = makeSlide({
      players: [makePlayer('p1', 80, 30)],
      arrows: [
        {
          id: 'a1',
          annotationType: 'arrow',
          arrowType: 'pass',
          curveType: 'straight',
          points: [
            toScreenNormPoint(-10, 110, false),
            toScreenNormPoint(50, 50),
          ],
          color: '#ffffff',
          strokeWidth: 3,
          dashArray: [],
          startMarker: 'none',
          endMarker: 'arrow',
        },
      ],
      texts: [
        {
          id: 't1',
          annotationType: 'text',
          x: toScreenNormCoord(-5),
          y: toScreenNormCoord(105),
          content: 'Out',
          fontSize: 16,
          color: '#ffffff',
          bold: false,
          italic: false,
        },
      ],
    });

    const transformed = transformSlideForAspect(slide, '16:9', '4:5');
    expect(transformed.players[0].x).toBeGreaterThanOrEqual(-15);
    expect(transformed.players[0].x).toBeLessThanOrEqual(115);
    expect(
      transformed.arrows[0].points[0].x < 0 ||
        transformed.arrows[0].points[0].y > 100,
    ).toBe(true);
    expect(transformed.texts[0].x < 0 || transformed.texts[0].y > 100).toBe(
      true,
    );
  });
});

const makePhase = (
  overrides?: Partial<DomainTacticalPhase>,
): DomainTacticalPhase => ({
  id: 'ph1',
  name: 'Phase 1',
  aspectRatio: '16:9',
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
  slides: [makeSlide()],
  ...overrides,
});

describe('applyImageBackgroundToPhase & restoreDefaultPitchInPhase', () => {
  it('未編集スライドではその場で背景画像を適用し、編集中スライドでは新規スライドを追加する', () => {
    const initialPhase = makePhase();
    expect(isDefaultInitialSlide(initialPhase.slides[0], initialPhase)).toBe(
      true,
    );

    const first = applyImageBackgroundToPhase(
      initialPhase,
      'data:image/png;base64,img1',
      's1',
      () => 's-unused',
    );
    expect(first.phase.slides).toHaveLength(1);
    expect(first.phase.backgroundType).toBe('image');
    expect(first.phase.backgroundImageUrl).toBe('data:image/png;base64,img1');
    expect(first.phase.boundaryBox.width).toBe(96);
    expect(first.phase.slides[0].ball.visible).toBe(false);

    // すでに image 背景になっているため 2 回目は編集中扱いになり新規スライドが追加される
    const second = applyImageBackgroundToPhase(
      first.phase,
      'data:image/png;base64,img2',
      's1',
      () => 's2',
    );
    expect(second.phase.slides).toHaveLength(2);
    expect(second.activeSlideId).toBe('s2');
    expect(second.phase.backgroundImageUrl).toBe('data:image/png;base64,img2');

    const restored = restoreDefaultPitchInPhase(second.phase);
    expect(restored.backgroundType).toBe('pitch');
    expect(restored.backgroundImageUrl).toBeUndefined();
  });
});

describe('computeAutoFitBoundaryBox & computeXMediaPresetBoundaryBox', () => {
  it('16:9 ズーム・パン時の自動フィットと X メディアプリセットを計算する', () => {
    const zoomed = computeAutoFitBoundaryBox({
      aspectRatio: '16:9',
      pitchTransform: {
        panX: 192,
        panY: 108,
        zoom: 1.5,
        tilt: 0,
        isLocked: false,
      },
    });
    expect(zoomed.x).toBeCloseTo(10, 2);
    expect(zoomed.y).toBeCloseTo(10, 2);
    expect(zoomed.width).toBeCloseTo(150, 2);
    expect(zoomed.height).toBeCloseTo(150, 2);

    const preset45 = computeXMediaPresetBoundaryBox('single_image_4_5', '16:9');
    expect(preset45.width).toBe(45);
    expect(preset45.height).toBe(100);
    expect(preset45.x).toBe(27.5);
  });
});
