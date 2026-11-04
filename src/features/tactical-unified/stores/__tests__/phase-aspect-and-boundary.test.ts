import { describe, expect, it } from 'vitest';
import { getScreenOuterPitchRect } from '@/lib/tactical/pitch-geometry';
import {
  createDefaultProject,
  createDefaultSlide,
  DEFAULT_BOUNDARY_BOX_16_9,
} from '@/lib/types/tactical-unified';
import {
  transformSlideAspectRatio,
  transformSlideForAspect,
} from '../slide-aspect-helpers';
import {
  selectActivePhaseAspectRatio,
  selectActivePhaseBoundaryBox,
} from '../tactical-unified-selectors';
import { createTacticalUnifiedStore } from '../tactical-unified-store';

describe('Phase 2: TacticalPhase-scoped AspectRatio and BoundaryBox Store', () => {
  it('selects active phase aspectRatio and boundaryBox with fallback', () => {
    const project = createDefaultProject('Test Project');
    const store = createTacticalUnifiedStore({ project });

    // 初期状態は 16:9 かつ DEFAULT_BOUNDARY_BOX_16_9
    expect(selectActivePhaseAspectRatio(store.getState())).toBe('16:9');
    expect(selectActivePhaseBoundaryBox(store.getState())).toEqual(
      DEFAULT_BOUNDARY_BOX_16_9,
    );
  });

  it('setAspectRatio only updates active phase and leaves boundaryBox unchanged', () => {
    const project = createDefaultProject('Test Project');
    const store = createTacticalUnifiedStore({ project });

    const phase1Id = store.getState().project.phases[0].id;
    // フェーズ 2 を追加
    const phase2Id = store.getState().addPhase('Phase 2');

    // フェーズ 1 をアクティブにする
    store.getState().setActivePhase(phase1Id);

    // カスタム境界線を設定
    const customBox = {
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      enabled: true,
      visible: true,
    };
    store.getState().updateActiveSlideBoundaryBox(customBox);

    expect(selectActivePhaseBoundaryBox(store.getState())).toMatchObject(
      customBox,
    );

    // 比率を 4:5 に変更
    store.getState().setAspectRatio('4:5');

    // アクティブフェーズと project の aspectRatio が更新される
    expect(selectActivePhaseAspectRatio(store.getState())).toBe('4:5');
    expect(store.getState().project.aspectRatio).toBe('4:5');

    // boundaryBox は一切変更されない（customBox のまま）
    expect(selectActivePhaseBoundaryBox(store.getState())).toMatchObject(
      customBox,
    );

    // フェーズ 2 は影響を受けず 16:9 のまま
    const phase2 = store
      .getState()
      .project.phases.find((p) => p.id === phase2Id);
    expect(phase2?.aspectRatio).toBe('16:9');
  });

  it('boundaryBox updates are shared across all slides in active phase and do not leak to other phases', () => {
    const project = createDefaultProject('Test Project');
    const store = createTacticalUnifiedStore({ project });

    const phase1Id = store.getState().project.phases[0].id;
    const slide1Id = store.getState().project.phases[0].slides[0].id;
    // フェーズ 1 内にスライド 2 を追加
    const slide2Id = store.getState().addSlide(slide1Id);

    // フェーズ 2 を追加
    const phase2Id = store.getState().addPhase('Phase 2');

    // フェーズ 1 で境界線を変更
    store.getState().setActivePhase(phase1Id);
    const boxPhase1 = {
      x: 15,
      y: 20,
      width: 70,
      height: 60,
      enabled: true,
      visible: true,
    };
    store.getState().setBoundaryBox(slide1Id, boxPhase1);

    // フェーズ 1 内のスライド 2 に切り替えても同じ境界線
    store.getState().setActiveSlide(slide2Id);
    expect(selectActivePhaseBoundaryBox(store.getState())).toMatchObject(
      boxPhase1,
    );

    // フェーズ 2 に切り替えると、フェーズ 1 の境界線は影響していない（デフォルト）
    store.getState().setActivePhase(phase2Id);
    expect(selectActivePhaseBoundaryBox(store.getState())).toEqual(
      DEFAULT_BOUNDARY_BOX_16_9,
    );
  });

  it('autoFitBoundaryBox and applyXMediaPreset(pitch_fit) set outer pitch rect based on active phase aspect', () => {
    const project = createDefaultProject('Test Project');
    const store = createTacticalUnifiedStore({ project });

    // 4:5 に変更
    store.getState().setAspectRatio('4:5');

    // autoFitBoundaryBox 実行
    store.getState().autoFitBoundaryBox();

    const outerRect4_5 = getScreenOuterPitchRect('4:5');
    const box = selectActivePhaseBoundaryBox(store.getState());
    expect(box.x).toBeCloseTo(outerRect4_5.left, 1);
    expect(box.y).toBeCloseTo(outerRect4_5.top, 1);
    expect(box.width).toBeCloseTo(outerRect4_5.width, 1);
    expect(box.height).toBeCloseTo(outerRect4_5.height, 1);

    // applyXMediaPreset('pitch_fit') も同様
    store.getState().applyXMediaPreset('pitch_fit');
    const box2 = selectActivePhaseBoundaryBox(store.getState());
    expect(box2.x).toBeCloseTo(outerRect4_5.left, 1);
    expect(box2.y).toBeCloseTo(outerRect4_5.top, 1);
    expect(box2.width).toBeCloseTo(outerRect4_5.width, 1);
    expect(box2.height).toBeCloseTo(outerRect4_5.height, 1);
  });

  it('syncs active phase aspectRatio and boundaryBox to project mirror on phase/slide switch', () => {
    const project = createDefaultProject('Test Project');
    const store = createTacticalUnifiedStore({ project });

    const phase1Id = store.getState().project.phases[0].id;
    const phase2Id = store.getState().addPhase('Phase 2');

    // フェーズ 2 の比率と境界線を変更
    store.getState().setActivePhase(phase2Id);
    store.getState().setAspectRatio('9:16');
    const boxPhase2 = {
      x: 5,
      y: 5,
      width: 90,
      height: 90,
      enabled: true,
      visible: true,
    };
    store.getState().updateActiveSlideBoundaryBox(boxPhase2);

    expect(store.getState().project.aspectRatio).toBe('9:16');
    expect(store.getState().project.boundaryBox).toMatchObject(boxPhase2);

    // フェーズ 1 に戻す
    store.getState().setActivePhase(phase1Id);
    expect(store.getState().project.aspectRatio).toBe('16:9');
    expect(store.getState().project.boundaryBox).toEqual(
      DEFAULT_BOUNDARY_BOX_16_9,
    );

    // 再度フェーズ 2 に切り替え
    store.getState().setActivePhase(phase2Id);
    expect(store.getState().project.aspectRatio).toBe('9:16');
    expect(store.getState().project.boundaryBox).toMatchObject(boxPhase2);
  });

  it('transformSlideForAspect transforms players/ball with clamping, annotations with clamp=false, and preserves boundaryBox', () => {
    const baseSlide = createDefaultSlide(0, '16:9');
    const customBox = {
      x: 12,
      y: 12,
      width: 76,
      height: 76,
      enabled: true,
      visible: true,
    };
    const slideWithAnnos = {
      ...baseSlide,
      boundaryBox: customBox,
      players: [{ ...baseSlide.players[0], x: 50, y: 50 }],
      ball: { x: 50, y: 50, visible: true },
      arrows: [
        {
          id: 'a1',
          annotationType: 'arrow' as const,
          arrowType: 'pass' as const,
          curveType: 'straight' as const,
          points: [
            { x: -10, y: 110 },
            { x: 50, y: 50 },
          ],
          color: '#ffffff',
          strokeWidth: 3,
          dashArray: [],
          arrowHead: true,
        },
      ],
      texts: [
        {
          id: 't1',
          annotationType: 'text' as const,
          content: 'Outside',
          x: -5,
          y: 105,
          fontSize: 16,
          color: '#ffffff',
          bold: false,
          italic: false,
        },
      ],
    };

    const transformed = transformSlideForAspect(slideWithAnnos, '16:9', '4:5');

    // boundaryBox は上書きされず維持される
    expect(transformed.boundaryBox).toEqual(customBox);
    // 選手・ボールはクランプされる (0 <= x, y <= 100)
    expect(transformed.players[0].x).toBeGreaterThanOrEqual(0);
    expect(transformed.players[0].x).toBeLessThanOrEqual(100);
    expect(transformed.players[0].y).toBeGreaterThanOrEqual(0);
    expect(transformed.players[0].y).toBeLessThanOrEqual(100);
    expect(transformed.ball.x).toBeGreaterThanOrEqual(0);
    expect(transformed.ball.x).toBeLessThanOrEqual(100);

    // 矢印の points や texts は clamp: false なので範囲外（< 0 または > 100）が保持される
    expect(
      transformed.arrows[0].points[0].x < 0 ||
        transformed.arrows[0].points[0].y > 100,
    ).toBe(true);
    expect(transformed.texts[0].x < 0 || transformed.texts[0].y > 100).toBe(
      true,
    );
  });
});
