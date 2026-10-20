import { act, render, waitFor } from '@testing-library/react';
import Konva from 'konva';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { getPitchRectNormalized } from '@/lib/tactical/pitch-stage-mapping';
import {
  ASPECT_RATIOS,
  createDefaultPlayer,
} from '@/lib/types/tactical-unified';
import { FullTacticalCanvas } from '../FullTacticalCanvas';

// jsdom では SVG 画像がロードされないため、ピッチ画像をダミー要素で供給する
vi.mock('@/lib/tactical/pitch-svg', () => {
  const img = document.createElement('img');
  return {
    getCachedPitchSvgImage: () => img,
    loadPitchSvgImage: async () => img,
    preloadAllPitchSvgImages: () => {},
  };
});

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
  useTacticalUnifiedStore.getState().resetProject();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FullTacticalCanvas integration', () => {
  it('aspectRatio 変更で Stage は不変、ピッチ矩形のみ比率に追従する', async () => {
    render(
      <div style={{ width: 1000, height: 600 }}>
        <FullTacticalCanvas />
      </div>,
    );

    const pitchRect = () => {
      const img = lastStage().findOne('Image');
      if (!img) throw new Error('no pitch image');
      return { w: img.width(), h: img.height(), x: img.x(), y: img.y() };
    };

    await waitFor(() => {
      expect(lastStage().width()).toBe(1000);
      expect(lastStage().height()).toBe(600);
      expect(lastStage().findOne('Image')).toBeTruthy();
    });

    for (const ratio of ['4:5', '1:1', '9:16', '16:9'] as const) {
      act(() => {
        useTacticalUnifiedStore.getState().setAspectRatio(ratio);
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
    render(
      <div style={{ width: 1000, height: 600 }}>
        <FullTacticalCanvas />
      </div>,
    );
    await waitFor(() => {
      expect(useTacticalUnifiedStore.getState().stageAspect).toBeCloseTo(
        1000 / 600,
      );
    });

    const insidePitch = () => {
      const s = useTacticalUnifiedStore.getState();
      const rect = getPitchRectNormalized(s.stageAspect, s.project.aspectRatio);
      const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
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

    // 初期配置 (resetProject 直後)
    insidePitch();

    act(() => {
      const s = useTacticalUnifiedStore.getState();
      s.applyFormation(s.activeSlideId, '4-3-3', 'half', 'home');
    });
    insidePitch();

    for (const ratio of ['1:1', '16:9', '9:16', '4:5'] as const) {
      act(() => {
        useTacticalUnifiedStore.getState().setAspectRatio(ratio);
      });
      insidePitch();
    }
  });

  it('マーカーdragはキャンバス内にclampされ、矢印はclampされない', async () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const player = createDefaultPlayer('home', 50, 50, '#ff0000');
    store.updateSlide(slideId, { players: [player] });

    render(
      <div style={{ width: 1000, height: 600 }}>
        <FullTacticalCanvas />
      </div>,
    );
    await waitFor(() => {
      expect(lastStage().find('Group').length).toBeGreaterThan(0);
    });

    // dragBoundFunc: Stage 外へは出られない
    const node = lastStage()
      .find('Group')
      .find((g) => g.draggable());
    if (!node) throw new Error('no draggable marker');
    const bound = node.dragBoundFunc();
    expect(bound?.call(node, { x: -300, y: 9999 }, null as never)).toEqual({
      x: 0,
      y: 600,
    });
    expect(bound?.call(node, { x: 5000, y: -5 }, null as never)).toEqual({
      x: 1000,
      y: 0,
    });

    // ストア更新でも 0-100 に clamp
    act(() => {
      useTacticalUnifiedStore
        .getState()
        .updatePlayer(slideId, player.id, { x: -40, y: 250 });
    });
    const moved = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId)
      ?.players.find((p) => p.id === player.id);
    expect(moved?.x).toBe(0);
    expect(moved?.y).toBe(100);

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
      useTacticalUnifiedStore.getState().addArrow(slideId, arrow);
      useTacticalUnifiedStore.getState().updateArrow(slideId, arrow.id, {
        points: [
          { x: -30, y: 140 },
          { x: 160, y: -20 },
        ],
      });
    });
    const a = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId)
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

    const store = useTacticalUnifiedStore.getState();
    const slide1Id = store.activeSlideId;
    const player = createDefaultPlayer('home', 10, 50, '#ff0000');
    store.updateSlide(slide1Id, { players: [player] });
    const slide2Id = useTacticalUnifiedStore
      .getState()
      .duplicateSlide(slide1Id);
    useTacticalUnifiedStore.getState().updateSlide(slide2Id, {
      players: [{ ...player, x: 90 }],
    });

    render(
      <div style={{ width: 800, height: 800 }}>
        <FullTacticalCanvas />
      </div>,
    );
    await waitFor(() => {
      expect(lastStage().find('Group').length).toBeGreaterThan(0);
    });

    const snapshot = () =>
      lastStage()
        .find('Group')
        .map((g) => g.x());
    const before = snapshot();

    act(() => {
      useTacticalUnifiedStore.getState().setIsPlaying(true);
    });
    await waitFor(() => expect(callbacks.length).toBeGreaterThan(0));

    // 再生開始フレーム → 遷移時間(既定1000ms)の中間
    act(() => callbacks.shift()?.(1000));
    act(() => callbacks.shift()?.(1500));

    const mid = snapshot();
    expect(mid).not.toEqual(before);
    const moved = mid.filter((x, i) => x !== before[i]);
    expect(moved.length).toBeGreaterThan(0);
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(true);

    // 一時停止でループが止まる
    act(() => {
      useTacticalUnifiedStore.getState().setIsPlaying(false);
    });
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('再生中の unmount で RAF が停止し isPlaying=false になる', async () => {
    vi.stubGlobal('requestAnimationFrame', () => 42);
    const cancel = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancel);

    const store = useTacticalUnifiedStore.getState();
    const slide1Id = store.activeSlideId;
    store.duplicateSlide(slide1Id);

    const { unmount } = render(
      <div style={{ width: 1000, height: 600 }}>
        <FullTacticalCanvas />
      </div>,
    );
    act(() => {
      useTacticalUnifiedStore.getState().setIsPlaying(true);
    });
    unmount();
    expect(cancel).toHaveBeenCalled();
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);
  });
});
