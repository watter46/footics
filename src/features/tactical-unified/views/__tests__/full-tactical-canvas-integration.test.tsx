import { act, render, waitFor } from '@testing-library/react';
import Konva from 'konva';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculatePitchRect } from '@/features/tactical-unified/core';
import {
  createDocumentStore,
  type DocumentStore,
} from '@/features/tactical-unified/stores/document-store';
import {
  createPlaybackStore,
  type PlaybackStore,
} from '@/features/tactical-unified/stores/playback-store';
import {
  createSessionStore,
  type SessionStore,
} from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  ASPECT_RATIOS,
  createDefaultPlayer,
} from '@/lib/types/tactical-unified';
import { FullTacticalCanvas } from '../FullTacticalCanvas';

class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: { width: 1000, height: 600 },
        } as unknown as ResizeObserverEntry,
      ],
      this,
    );
  }
  unobserve() {}
  disconnect() {}
}

function lastStage(): Konva.Stage {
  const stage = Konva.stages[Konva.stages.length - 1];
  if (!stage) throw new Error('no stage');
  return stage;
}

let documentStore: DocumentStore;
let sessionStore: SessionStore;
let playbackStore: PlaybackStore;

function renderCanvas(width = 1000, height = 600) {
  return render(
    <TacticalStoreProvider
      stores={{ documentStore, sessionStore, playbackStore }}
    >
      <div style={{ width, height }}>
        <FullTacticalCanvas />
      </div>
    </TacticalStoreProvider>,
  );
}

beforeEach(() => {
  global.ResizeObserver = MockResizeObserver;
  const mockCtx = new Proxy(
    {
      getImageData: () => ({ data: new Array(4) }),
      createImageData: () => [],
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      measureText: () => ({ width: 0 }),
      getLineDash: () => [],
      isPointInPath: () => true,
      createLinearGradient: () => ({ addColorStop: vi.fn() }),
      createRadialGradient: () => ({ addColorStop: vi.fn() }),
    } as Record<string, unknown>,
    {
      get: (target, prop: string) => (prop in target ? target[prop] : vi.fn()),
    },
  );
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
  const initialProject = createDefaultTacticalProject();
  const initialPhase = initialProject.phases[0];
  const initialSlide = initialPhase?.slides[0];
  documentStore = createDocumentStore(initialProject);
  sessionStore = createSessionStore({
    activePhaseId: initialPhase?.id ?? 'phase-1',
    activeSlideId: initialSlide?.id ?? 'slide-1',
  });
  playbackStore = createPlaybackStore();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FullTacticalCanvas integration', () => {
  it('aspectRatio 変更で Stage は不変、ピッチ矩形のみ比率に追従する', async () => {
    renderCanvas(1000, 600);

    const pitchRect = () => {
      const img = lastStage().findOne('Image');
      if (!img) throw new Error('no pitch image');
      const pos = img.getAbsolutePosition();
      return { w: img.width(), h: img.height(), x: pos.x, y: pos.y };
    };

    // 初期状態 (Stage は 1000x600 で不変、ピッチ画像が存在する)
    await waitFor(() => {
      expect(lastStage().width()).toBe(1000);
      expect(lastStage().height()).toBe(600);
      expect(lastStage().findOne('Image')).toBeTruthy();
    });

    for (const ratio of ['4:5', '1:1', '9:16', '16:9'] as const) {
      act(() => {
        const phaseId = sessionStore.getState().activePhaseId;
        documentStore.getState().dispatch({
          type: 'CHANGE_PHASE_ASPECT_RATIO',
          phaseId,
          aspectRatio: ratio,
        });
      });
      await waitFor(() => {
        const r = pitchRect();
        expect(r.w / r.h).toBeCloseTo(ASPECT_RATIOS[ratio], 1);
      });
      // Stage サイズは常にコンテナいっぱいで不変
      expect(lastStage().width()).toBe(1000);
      expect(lastStage().height()).toBe(600);
      // ピッチはステージ内に収まり中央揃え
      const r = pitchRect();
      expect(r.w).toBeLessThanOrEqual(1000);
      expect(r.h).toBeLessThanOrEqual(600);
      expect(Math.abs(r.x * 2 + r.w - 1000)).toBeLessThanOrEqual(2);
      expect(Math.abs(r.y * 2 + r.h - 600)).toBeLessThanOrEqual(2);
    }
  });

  it('初期配置/フォーメーション適用/比率変更後、マーカーはピッチ矩形内に収まる', async () => {
    renderCanvas(1000, 600);
    await waitFor(() => {
      expect(sessionStore.getState().stageAspect).toBeCloseTo(16 / 9);
    });

    const insidePitch = () => {
      const s = sessionStore.getState();
      const d = documentStore.getState();
      const phase = d.project.phases.find((ph) => ph.id === s.activePhaseId);
      if (!phase) throw new Error('no active phase');
      const stageW = 100 * (s.stageAspect ?? 1);
      const stageH = 100;
      const rawRect = calculatePitchRect(
        { width: stageW, height: stageH },
        phase.aspectRatio,
      );
      const rect = {
        x: (rawRect.x / stageW) * 100,
        y: (rawRect.y / stageH) * 100,
        width: (rawRect.width / stageW) * 100,
        height: (rawRect.height / stageH) * 100,
      };
      const slide = phase.slides.find((sl) => sl.id === s.activeSlideId);
      const pitchPlayers = (slide?.players ?? []).filter(
        (p) => p.area === 'pitch',
      );
      expect(pitchPlayers.length).toBeGreaterThan(0);
      for (const p of pitchPlayers) {
        expect(p.x).toBeGreaterThanOrEqual(rect.x - 0.01);
        expect(p.x).toBeLessThanOrEqual(rect.x + rect.width + 0.01);
        expect(p.y).toBeGreaterThanOrEqual(rect.y - 0.01);
        expect(p.y).toBeLessThanOrEqual(rect.y + rect.height + 0.01);
      }
    };

    // 初期配置
    insidePitch();

    for (const ratio of ['1:1', '16:9', '9:16', '4:5'] as const) {
      act(() => {
        const phaseId = sessionStore.getState().activePhaseId;
        documentStore.getState().dispatch({
          type: 'CHANGE_PHASE_ASPECT_RATIO',
          phaseId,
          aspectRatio: ratio,
        });
      });
      insidePitch();
    }
  });

  it('マーカーdragはキャンバス内にclampされ、矢印はclampされない', async () => {
    const phaseId = sessionStore.getState().activePhaseId;
    const slideId = sessionStore.getState().activeSlideId;
    const player = createDefaultPlayer('home', 50, 50, '#ff0000');
    documentStore.getState().dispatchSlide(phaseId, slideId, {
      type: 'REPLACE_PLAYERS',
      players: [player] as never,
    });

    renderCanvas(1000, 600);
    await waitFor(() => {
      expect(lastStage().find('Group').length).toBeGreaterThan(0);
    });

    // dragBoundFunc: 16:9 スクリーン境界外へはみ出さない
    const node = lastStage()
      .find('Group')
      .find((g) => g.draggable());
    if (!node) throw new Error('no draggable marker');
    const bound = node.dragBoundFunc();
    expect(bound?.call(node, { x: -300, y: 9999 }, null as never)).toEqual({
      x: 0,
      y: 581.25,
    });
    expect(bound?.call(node, { x: 5000, y: -5 }, null as never)).toEqual({
      x: 1000,
      y: 18.75,
    });

    // ストア更新ではピッチ外余白座標をそのまま保持する
    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'UPDATE_PLAYER',
        id: player.id,
        patch: { x: -10, y: 110 } as never,
      });
    });
    const moved = documentStore
      .getState()
      .project.phases.find((ph) => ph.id === phaseId)
      ?.slides.find((s) => s.id === slideId)
      ?.players.find((p) => p.id === player.id);
    expect(moved?.x).toBe(-10);
    expect(moved?.y).toBe(110);

    // 矢印(ツールオブジェクト)は clamp しない
    const arrow = {
      id: 'test-arrow-1',
      annotationType: 'arrow' as const,
      arrowType: 'pass' as const,
      curveType: 'straight' as const,
      color: '#ffffff',
      strokeWidth: 3,
      dashArray: [],
      arrowHead: true,
      points: [
        { x: 10, y: 10 },
        { x: 10, y: 10 },
      ],
    };
    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'ADD_ARROW',
        arrow: arrow as never,
      });
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'UPDATE_ARROW',
        id: arrow.id,
        patch: {
          points: [
            { x: -30, y: 140 },
            { x: 160, y: -20 },
          ],
        } as never,
      });
    });
    const a = documentStore
      .getState()
      .project.phases.find((ph) => ph.id === phaseId)
      ?.slides.find((s) => s.id === slideId)
      ?.arrows.find((x) => x.id === arrow.id);
    expect(a?.points[0]).toEqual({ x: -30, y: 140 });
    expect(a?.points[1]).toEqual({ x: 160, y: -20 });
  });

  it('isPlaying=true で再生ループが起動しノード座標が補間される', async () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const phaseId = sessionStore.getState().activePhaseId;
    const slide1Id = sessionStore.getState().activeSlideId;
    const player = createDefaultPlayer('home', 10, 50, '#ff0000');
    documentStore.getState().dispatchSlide(phaseId, slide1Id, {
      type: 'REPLACE_PLAYERS',
      players: [player] as never,
    });
    documentStore.getState().dispatch({
      type: 'DUPLICATE_SLIDE',
      phaseId,
      slideId: slide1Id,
    });
    const slides =
      documentStore.getState().project.phases.find((ph) => ph.id === phaseId)
        ?.slides ?? [];
    const slide2Id = slides[slides.length - 1]?.id;
    if (!slide2Id) throw new Error('no duplicated slide');
    documentStore.getState().dispatchSlide(phaseId, slide2Id, {
      type: 'REPLACE_PLAYERS',
      players: [{ ...player, x: 90 }] as never,
    });

    renderCanvas(800, 800);
    await waitFor(() => {
      expect(lastStage().find('Group').length).toBeGreaterThan(0);
    });

    const snapshot = () =>
      lastStage()
        .find('Group')
        .map((g) => g.x());
    const before = snapshot();

    act(() => {
      playbackStore.getState().startPlayback();
    });
    await waitFor(() => expect(callbacks.length).toBeGreaterThan(0));

    // 再生開始フレーム → 遷移時間(既定1000ms)の中間
    act(() => callbacks.shift()?.(1000));
    act(() => callbacks.shift()?.(1500));

    const mid = snapshot();
    expect(mid).not.toEqual(before);
    expect(playbackStore.getState().isPlaying).toBe(true);

    // 一時停止で再生が止まる
    act(() => {
      playbackStore.getState().pausePlayback();
    });
    expect(playbackStore.getState().isPlaying).toBe(false);
  });

  it('再生中の unmount でエラーなくクリーンアップされる', async () => {
    vi.stubGlobal('requestAnimationFrame', () => 42);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const phaseId = sessionStore.getState().activePhaseId;
    const slide1Id = sessionStore.getState().activeSlideId;
    documentStore.getState().dispatch({
      type: 'DUPLICATE_SLIDE',
      phaseId,
      slideId: slide1Id,
    });

    const { unmount } = renderCanvas(1000, 600);
    act(() => {
      playbackStore.getState().startPlayback();
    });
    expect(() => unmount()).not.toThrow();
  });
});
