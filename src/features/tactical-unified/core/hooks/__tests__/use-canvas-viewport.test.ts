import { act, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasViewport } from '../use-canvas-viewport';

type ResizeCallback = (entries: ResizeObserverEntry[]) => void;

describe('useCanvasViewport', () => {
  let resizeCallback: ResizeCallback | null = null;
  let disconnectMock: ReturnType<typeof vi.fn>;
  let rafCallbacks: Array<{ id: number; cb: FrameRequestCallback }> = [];
  let nextRafId = 1;
  let requestAnimationFrameSpy: ReturnType<typeof vi.spyOn>;
  let cancelAnimationFrameSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resizeCallback = null;
    disconnectMock = vi.fn();
    rafCallbacks = [];
    nextRafId = 1;

    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: ResizeCallback) {
          resizeCallback = cb;
        }
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = disconnectMock;
      },
    );

    requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        const id = nextRafId++;
        rafCallbacks.push({ id, cb });
        return id;
      });

    cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((id: number) => {
        rafCallbacks = rafCallbacks.filter((item) => item.id !== id);
      });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function emitResize(width: number, height: number) {
    resizeCallback?.([
      { contentRect: { width, height } } as ResizeObserverEntry,
    ]);
  }

  function flushRaf() {
    const queue = [...rafCallbacks];
    rafCallbacks = [];
    for (const item of queue) {
      item.cb(performance.now());
    }
  }

  function TestHarness() {
    const { containerRef, containerSize, vRect } = useCanvasViewport();
    return createElement('div', {
      ref: containerRef,
      'data-testid': 'viewport',
      'data-size': `${containerSize.width}x${containerSize.height}`,
      'data-vrect': `${vRect.width}x${vRect.height}`,
    });
  }

  it('applies the initial ResizeObserver notification synchronously', () => {
    const { getByTestId } = render(createElement(TestHarness));
    const el = getByTestId('viewport');

    act(() => {
      emitResize(800, 450);
    });

    expect(el.getAttribute('data-size')).toBe('800x450');
    expect(el.getAttribute('data-vrect')).toBe('800x450');
    expect(requestAnimationFrameSpy).not.toHaveBeenCalled();
  });

  it('coalesces subsequent resize notifications into a single requestAnimationFrame', () => {
    const { getByTestId, unmount } = render(createElement(TestHarness));
    const el = getByTestId('viewport');

    act(() => {
      emitResize(800, 450);
    });

    act(() => {
      emitResize(700, 450);
      emitResize(600, 450);
    });

    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
    expect(el.getAttribute('data-size')).toBe('800x450');

    act(() => {
      flushRaf();
    });

    expect(el.getAttribute('data-size')).toBe('600x450');

    act(() => {
      emitResize(500, 450);
    });
    unmount();

    expect(disconnectMock).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrameSpy).toHaveBeenCalledTimes(1);
  });
});
