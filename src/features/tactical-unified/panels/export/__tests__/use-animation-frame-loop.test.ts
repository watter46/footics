import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnimationFrameLoop } from '../use-animation-frame-loop';

describe('useAnimationFrameLoop', () => {
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let nextRafId: number;

  beforeEach(() => {
    rafCallbacks = new Map();
    nextRafId = 1;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      const id = nextRafId++;
      rafCallbacks.set(id, cb);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      rafCallbacks.delete(id);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('case 1: initialTimeMs = 1500 でマウントしたとき、無用な onFrame(0) が自動発火せず、seek(2200) で onFrame(2200) が呼ばれること', () => {
    const onFrame = vi.fn();
    const { result } = renderHook(() =>
      useAnimationFrameLoop(false, 5000, onFrame, 1500),
    );

    expect(onFrame).not.toHaveBeenCalled();

    act(() => {
      result.current.seek(2200);
    });

    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(onFrame).toHaveBeenCalledWith(2200);
  });

  it('case 2: initialTimeMs = 1500, isPlaying = true で再生開始したとき、最初の rAF 進行が 0ms ではなく 1500ms + elapsed から進むこと', () => {
    const onFrame = vi.fn();
    renderHook(() => useAnimationFrameLoop(true, 5000, onFrame, 1500));

    expect(onFrame).not.toHaveBeenCalled();
    expect(rafCallbacks.size).toBe(1);

    const firstCb = Array.from(rafCallbacks.values())[0];
    act(() => {
      firstCb?.(1000);
    });

    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(onFrame).toHaveBeenCalledWith(1500);

    const secondCb = Array.from(rafCallbacks.values())[1];
    act(() => {
      secondCb?.(1050);
    });

    expect(onFrame).toHaveBeenCalledTimes(2);
    expect(onFrame).toHaveBeenLastCalledWith(1550);
  });

  it('case 3: onFrame コールバックが再レンダーで差し替わっても、停止中に勝手に onFrame が再実行されないこと', () => {
    const onFrame1 = vi.fn();
    const onFrame2 = vi.fn();

    const { rerender } = renderHook(
      ({ onFrame }) => useAnimationFrameLoop(false, 5000, onFrame, 1500),
      { initialProps: { onFrame: onFrame1 } },
    );

    expect(onFrame1).not.toHaveBeenCalled();

    rerender({ onFrame: onFrame2 });

    expect(onFrame1).not.toHaveBeenCalled();
    expect(onFrame2).not.toHaveBeenCalled();
  });
});
