import { beforeEach, describe, expect, it } from 'vitest';
import { normToPx, pxToNorm } from '@/features/tactical-unified/objects/canvas';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';

describe('L2-Tactical-026: PitchTransform Store Actions & Lock Behavior', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });
  it('初期状態ではピッチはアンロック(isLocked = false)である', () => {
    const store = useTacticalUnifiedStore.getState();
    const activeSlide = store.project.slides.find(
      (s) => s.id === store.activeSlideId,
    );
    expect(activeSlide?.pitchTransform?.isLocked ?? false).toBe(false);
  });

  it('togglePitchLock でロック状態がトグルされる', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    store.togglePitchLock(slideId);
    let slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slide?.pitchTransform?.isLocked).toBe(true);

    store.togglePitchLock(slideId);
    slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slide?.pitchTransform?.isLocked).toBe(false);
  });

  it('updatePitchTransform で panX, panY, zoom が更新され、既存の isLocked 状態が維持される', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    store.togglePitchLock(slideId); // lock it first
    store.updatePitchTransform(slideId, {
      panX: 120,
      panY: -50,
      zoom: 1.8,
    });

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slide?.pitchTransform?.panX).toBe(120);
    expect(slide?.pitchTransform?.panY).toBe(-50);
    expect(slide?.pitchTransform?.zoom).toBe(1.8);
    expect(slide?.pitchTransform?.isLocked).toBe(true);
  });

  it('ピッチのズーム・パンを変更しても境界線(boundaryBox)の配置・サイズは影響を受けない', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const initialBox = store.project.slides[0]?.boundaryBox;

    expect(initialBox).toBeDefined();

    // ピッチを大きくズーム・パン
    store.updatePitchTransform(slideId, {
      panX: 200,
      panY: 150,
      zoom: 2.5,
    });

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    // boundaryBox はピッチの transform と無関係に固定値を維持
    expect(slide?.boundaryBox).toEqual(initialBox);
  });

  it('スライド複製(duplicateSlide)時に pitchTransform のズーム・パン・ロック状態が保持される', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    store.updatePitchTransform(slideId, {
      panX: 45,
      panY: 60,
      zoom: 1.4,
      isLocked: true,
    });

    const newSlideId = store.duplicateSlide(slideId);
    const newSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === newSlideId);

    expect(newSlide?.pitchTransform?.panX).toBe(45);
    expect(newSlide?.pitchTransform?.panY).toBe(60);
    expect(newSlide?.pitchTransform?.zoom).toBe(1.4);
    expect(newSlide?.pitchTransform?.isLocked).toBe(true);
  });
});

describe('Pitch Coordinate & Screen Mapping', () => {
  it('ズーム・パン適用時のスクリーンからピッチ座標への逆変換が正確である', () => {
    const pitchRect = { x: 50, y: 30, width: 800, height: 450 };
    const panX = 100;
    const panY = 50;
    const zoom = 2.0;

    // ピッチ中心 (normX = 50, normY = 50)
    const pitchPxX = normToPx(50, pitchRect.width); // 400
    const pitchPxY = normToPx(50, pitchRect.height); // 225

    // スクリーン上での表示位置
    const screenX = pitchRect.x + panX + pitchPxX * zoom; // 50 + 100 + 400*2 = 950
    const screenY = pitchRect.y + panY + pitchPxY * zoom; // 30 + 50 + 225*2 = 530

    // スクリーン位置からピッチ座標への逆変換
    const invPitchPxX = (screenX - pitchRect.x - panX) / zoom;
    const invPitchPxY = (screenY - pitchRect.y - panY) / zoom;
    const invNormX = pxToNorm(invPitchPxX, pitchRect.width);
    const invNormY = pxToNorm(invPitchPxY, pitchRect.height);

    expect(invNormX).toBeCloseTo(50);
    expect(invNormY).toBeCloseTo(50);
  });

  it('ズーム・パン時のホイールズーム中心計算 (ポインタ固定ズーム)', () => {
    const pos = { x: 500, y: 300 };
    const oldZoom = 1.0;
    const oldPanX = 0;
    const oldPanY = 0;

    const nextZoom = 2.0;
    const scaleRatio = nextZoom / oldZoom;

    // ポインタ位置を中心としたズーム
    const nextPanX = pos.x - (pos.x - oldPanX) * scaleRatio;
    const nextPanY = pos.y - (pos.y - oldPanY) * scaleRatio;

    // 新しいズームとパンのもとで、ポインタ位置直下のピッチローカル座標が不変であることを確認
    const localBeforeX = (pos.x - oldPanX) / oldZoom;
    const localBeforeY = (pos.y - oldPanY) / oldZoom;

    const localAfterX = (pos.x - nextPanX) / nextZoom;
    const localAfterY = (pos.y - nextPanY) / nextZoom;

    expect(localAfterX).toBeCloseTo(localBeforeX);
    expect(localAfterY).toBeCloseTo(localBeforeY);
  });

  it('レターボックス(pitchRect.x, y > 0)がある場合のポインタ固定ズーム計算', () => {
    const pitchRect = { x: 60, y: 40, width: 800, height: 450 };
    const pos = { x: 500, y: 300 };
    const oldZoom = 1.2;
    const oldPanX = 20;
    const oldPanY = -10;

    const nextZoom = 2.4;
    const scaleRatio = nextZoom / oldZoom;

    const relX = pos.x - pitchRect.x;
    const relY = pos.y - pitchRect.y;
    const nextPanX = relX - (relX - oldPanX) * scaleRatio;
    const nextPanY = relY - (relY - oldPanY) * scaleRatio;

    // ズーム前後のポインタ位置直下のピッチローカル座標が不変であることを確認
    const localBeforeX = (pos.x - pitchRect.x - oldPanX) / oldZoom;
    const localBeforeY = (pos.y - pitchRect.y - oldPanY) / oldZoom;

    const localAfterX = (pos.x - pitchRect.x - nextPanX) / nextZoom;
    const localAfterY = (pos.y - pitchRect.y - nextPanY) / nextZoom;

    expect(localAfterX).toBeCloseTo(localBeforeX);
    expect(localAfterY).toBeCloseTo(localBeforeY);
  });
});

describe('L2-Tactical-026: Marquee Selection under Pitch Zoom', () => {
  it('ピッチズーム時に Marquee 選択ボックスがピッチ上の選手を正確に包含判定する', () => {
    const store = useTacticalUnifiedStore.getState();

    // 選手をピッチ中央 (50%, 50%) に配置
    const player = createDefaultPlayer('home', 50, 50, '#034694');
    store.addPlayer(player);

    const pitchRect = { x: 0, y: 0, width: 800, height: 450 };
    const panX = 100;
    const panY = 50;
    const zoom = 1.5;

    // 選手の位置 (ピッチ座標 400, 225) ➔ スクリーン座標 (100 + 400*1.5 = 700, 50 + 225*1.5 = 387.5)
    const playerScreenX =
      pitchRect.x + panX + normToPx(player.x, pitchRect.width) * zoom;
    const playerScreenY =
      pitchRect.y + panY + normToPx(player.y, pitchRect.height) * zoom;

    // スクリーン上で選手を囲む Marquee ボックス (680〜720, 360〜410)
    const marqueeStart = { x: playerScreenX - 20, y: playerScreenY - 20 };
    const marqueeEnd = { x: playerScreenX + 20, y: playerScreenY + 20 };

    // Marquee 領域をピッチ正規化座標に変換
    const minPitchX = (marqueeStart.x - pitchRect.x - panX) / zoom;
    const maxPitchX = (marqueeEnd.x - pitchRect.x - panX) / zoom;
    const minPitchY = (marqueeStart.y - pitchRect.y - panY) / zoom;
    const maxPitchY = (marqueeEnd.y - pitchRect.y - panY) / zoom;

    const minNormX = pxToNorm(minPitchX, pitchRect.width);
    const maxNormX = pxToNorm(maxPitchX, pitchRect.width);
    const minNormY = pxToNorm(minPitchY, pitchRect.height);
    const maxNormY = pxToNorm(maxPitchY, pitchRect.height);

    const isInside =
      player.x >= minNormX &&
      player.x <= maxNormX &&
      player.y >= minNormY &&
      player.y <= maxNormY;

    expect(isInside).toBe(true);
  });
});
