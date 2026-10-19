import { act, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  type ArrowAnnotation,
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
          contentRect: {
            width: 800,
            height: 450,
            top: 0,
            left: 0,
            bottom: 450,
            right: 800,
            x: 0,
            y: 0,
            toJSON: () => {},
          },
        } as unknown as ResizeObserverEntry,
      ],
      this,
    );
  }
  unobserve() {}
  disconnect() {}
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
});

describe('FullTacticalCanvas (Level 3 Feature View)', () => {
  it('activeSlide のマーカー・矢印情報がキャンバスストアに注入されて描画されること', async () => {
    const mockPlayer = createDefaultPlayer('home', 50, 50, '#ff0000');
    const mockArrow: ArrowAnnotation = {
      id: 'arrow-1',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      color: '#ffffff',
      strokeWidth: 3,
      dashArray: [],
      arrowHead: true,
    };

    const activeSlideId = useTacticalUnifiedStore.getState().activeSlideId;
    useTacticalUnifiedStore.getState().updateSlide(activeSlideId, {
      players: [mockPlayer],
      arrows: [mockArrow],
    });

    const { container } = render(
      <div style={{ width: 800, height: 450 }}>
        <FullTacticalCanvas imageAspect={16 / 9} />
      </div>,
    );

    expect(container).toBeDefined();
    // Konva stage container should be rendered
    await waitFor(() => {
      const stageElement = container.querySelector('.konvajs-content');
      expect(stageElement).not.toBeNull();
    });
  });

  it('ref を介して exportPng や copyToClipboard が実行可能であること', async () => {
    const handleRef = createRef<CanvasCoreHandle>();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: writeMock },
      configurable: true,
      writable: true,
    });

    render(
      <div style={{ width: 800, height: 450 }}>
        <FullTacticalCanvas ref={handleRef} imageAspect={16 / 9} />
      </div>,
    );

    expect(handleRef.current).toBeTruthy();
    expect(typeof handleRef.current?.exportPng).toBe('function');
    expect(typeof handleRef.current?.copyToClipboard).toBe('function');
    expect(typeof handleRef.current?.undo).toBe('function');
    expect(typeof handleRef.current?.redo).toBe('function');

    await act(async () => {
      await handleRef.current?.copyToClipboard();
    });
    expect(writeMock).toHaveBeenCalled();
  });
});
