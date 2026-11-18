import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  toMilliseconds,
  toScreenNormCoord,
} from '@/lib/types/tactical/branded';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { SceneCanvasThumbnail } from '../scene-canvas-thumbnail';

function createMinimalSlide(id = 'slide-1'): DomainSlide {
  return {
    id,
    label: 'Scene 1',
    index: 0,
    transitionDurationMs: toMilliseconds(500),
    pauseMs: toMilliseconds(0),
    easing: 'ease-in-out',
    players: [],
    arrows: [],
    zones: [],
    texts: [],
    ball: {
      x: toScreenNormCoord(0.5),
      y: toScreenNormCoord(0.5),
      visible: false,
    },
  };
}

describe('SceneCanvasThumbnail rAF scheduling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets canvas dimensions synchronously, defers drawing to rAF, and cancels rAF on unmount', () => {
    const rafCallbacks = new Map<number, FrameRequestCallback>();
    let nextRafId = 1;

    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => {
        const id = nextRafId++;
        rafCallbacks.set(id, cb);
        return id;
      });
    const cancelSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((id) => {
        rafCallbacks.delete(id);
      });

    const { container, unmount, rerender } = render(
      <SceneCanvasThumbnail
        slide={createMinimalSlide('s1')}
        width={120}
        height={68}
        aspectRatio="16:9"
      />,
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      vi.spyOn(canvas, 'getContext').mockReturnValue(ctx);
    }
    const saveSpy = ctx ? vi.spyOn(ctx, 'save') : null;
    expect(canvas?.width).toBe(120);
    expect(canvas?.height).toBe(68);
    expect(canvas?.style.width).toBe('120px');
    expect(canvas?.style.height).toBe('68px');

    expect(rafSpy).toHaveBeenCalledTimes(1);
    expect(rafCallbacks.size).toBe(1);

    // 連続更新時は古い rAF をキャンセルして最新のみ残す
    rerender(
      <SceneCanvasThumbnail
        slide={createMinimalSlide('s2')}
        width={160}
        height={90}
        aspectRatio="16:9"
      />,
    );

    expect(cancelSpy).toHaveBeenCalledWith(1);
    expect(rafSpy).toHaveBeenCalledTimes(2);
    expect(rafCallbacks.size).toBe(1);
    expect(canvas?.width).toBe(160);
    expect(canvas?.height).toBe(90);

    if (saveSpy) {
      expect(saveSpy).not.toHaveBeenCalled();
    }

    // rAF 発火で実描画パイプラインが実行される
    act(() => {
      const cb = rafCallbacks.get(2);
      cb?.(16);
    });
    if (saveSpy) {
      expect(saveSpy).toHaveBeenCalled();
    }

    unmount();
    expect(cancelSpy).toHaveBeenCalledWith(2);
  });

  it('batches multiple thumbnails to at most 2 renders per animation frame', () => {
    const rafCallbacks = new Map<number, FrameRequestCallback>();
    let nextRafId = 1;

    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => {
        const id = nextRafId++;
        rafCallbacks.set(id, cb);
        return id;
      });

    const saveSpies: ReturnType<typeof vi.fn>[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => {
        const saveSpy = vi.fn();
        saveSpies.push(saveSpy);
        return new Proxy(
          { save: saveSpy },
          {
            get(target, prop) {
              if (prop === 'save') return target.save;
              return vi.fn();
            },
          },
        ) as unknown as CanvasRenderingContext2D;
      },
    );

    const { container, unmount } = render(
      <>
        <SceneCanvasThumbnail slide={createMinimalSlide('s1')} />
        <SceneCanvasThumbnail slide={createMinimalSlide('s2')} />
        <SceneCanvasThumbnail slide={createMinimalSlide('s3')} />
        <SceneCanvasThumbnail slide={createMinimalSlide('s4')} />
      </>,
    );

    const canvases = Array.from(container.querySelectorAll('canvas'));
    expect(canvases).toHaveLength(4);
    expect(saveSpies).toHaveLength(4);

    // 初回は1つの rAF のみスケジュールされる
    expect(rafSpy).toHaveBeenCalledTimes(1);
    expect(rafCallbacks.size).toBe(1);

    // 1回目の rAF 発火で先頭2件のみ描画され、残り2件用に次の rAF が予約される
    act(() => {
      const cb = rafCallbacks.get(1);
      rafCallbacks.delete(1);
      cb?.(16);
    });

    const renderedAfterFirstFrame = saveSpies
      .slice(0, 4)
      .filter((spy) => spy.mock.calls.length > 0).length;
    expect(renderedAfterFirstFrame).toBe(2);
    expect(rafSpy).toHaveBeenCalledTimes(2);
    expect(rafCallbacks.size).toBe(1);

    // 2回目の rAF 発火で残り2件が描画される
    act(() => {
      const cb = rafCallbacks.get(2);
      rafCallbacks.delete(2);
      cb?.(32);
    });

    const renderedAfterSecondFrame = saveSpies
      .slice(0, 4)
      .filter((spy) => spy.mock.calls.length > 0).length;
    expect(renderedAfterSecondFrame).toBe(4);
    expect(rafCallbacks.size).toBe(0);

    unmount();
  });
});
