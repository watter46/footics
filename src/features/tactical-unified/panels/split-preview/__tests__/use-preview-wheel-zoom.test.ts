import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePreviewWheelZoom } from '../use-preview-wheel-zoom';

describe('usePreviewWheelZoom', () => {
  it('updates cue and pitchTransform with cursor-following zoom and pan compensation', () => {
    const container = document.createElement('div');
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 50,
      width: 800,
      height: 450,
      right: 900,
      bottom: 500,
      x: 100,
      y: 50,
      toJSON: () => {},
    });

    const containerRef = { current: container };
    const upsertActionCameraCue = vi.fn();
    const updatePitchTransform = vi.fn();

    const activeSlide = {
      id: 'slide-1',
      pitchTransform: { zoom: 1.0, panX: 0, panY: 0 },
    } as any;

    renderHook(() =>
      usePreviewWheelZoom({
        containerRef,
        activeCue: undefined,
        resolvedCamera: {
          zoom: 1.0,
          panX: 0,
          panY: 0,
          tilt: 0,
          isLocked: false,
        },
        activeSlide,
        currentTimeMs: 500,
        upsertActionCameraCue,
        updatePitchTransform,
      }),
    );

    // Mouse at (clientX: 700, clientY: 375) -> mouseX: 600, mouseY: 325
    // centerX: 400, centerY: 225 -> dx: 200, dy: 100
    // deltaY: -200 -> nextZoom: 1.0 - (-200 * 0.0015) = 1.30
    // k = 1.30 / 1.0 = 1.30
    // nextPanX = Math.round(0 * 1.3 + 200 * (1 - 1.3)) = -60
    // nextPanY = Math.round(0 * 1.3 + 100 * (1 - 1.3)) = -30
    const wheelEvent = new WheelEvent('wheel', {
      clientX: 700,
      clientY: 375,
      deltaY: -200,
      cancelable: true,
    });
    Object.defineProperty(wheelEvent, 'clientX', { value: 700 });
    Object.defineProperty(wheelEvent, 'clientY', { value: 375 });
    const preventDefaultSpy = vi.spyOn(wheelEvent, 'preventDefault');

    container.dispatchEvent(wheelEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(upsertActionCameraCue).toHaveBeenCalledWith(
      500,
      {
        zoom: 1.3,
        panX: -60,
        panY: -30,
      },
      undefined,
    );
    expect(updatePitchTransform).toHaveBeenCalledWith('slide-1', {
      zoom: 1.3,
      panX: -60,
      panY: -30,
    });
  });

  it('handles existing activeCue and zoom-out correctly without activeSlide', () => {
    const container = document.createElement('div');
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 600,
      right: 1000,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const containerRef = { current: container };
    const upsertActionCameraCue = vi.fn();
    const updatePitchTransform = vi.fn();

    const activeCue = {
      id: 'cue-99',
      zoom: 2.0,
      panX: 100,
      panY: 50,
      tilt: 0,
      yaw: 0,
    } as any;

    renderHook(() =>
      usePreviewWheelZoom({
        containerRef,
        activeCue,
        resolvedCamera: null,
        activeSlide: null,
        currentTimeMs: 1200,
        upsertActionCameraCue,
        updatePitchTransform,
      }),
    );

    // Mouse at center: clientX: 500, clientY: 300 -> dx: 0, dy: 0
    // deltaY: 200 -> nextZoom: 2.0 - (200 * 0.0015) = 1.70
    // k = 1.70 / 2.0 = 0.85
    // nextPanX = Math.round(100 * 0.85 + 0) = 85
    // nextPanY = Math.round(50 * 0.85 + 0) = 43 (42.5 -> 43)
    const wheelEvent = new WheelEvent('wheel', {
      clientX: 500,
      clientY: 300,
      deltaY: 200,
      cancelable: true,
    });
    Object.defineProperty(wheelEvent, 'clientX', { value: 500 });
    Object.defineProperty(wheelEvent, 'clientY', { value: 300 });

    container.dispatchEvent(wheelEvent);

    expect(upsertActionCameraCue).toHaveBeenCalledWith(
      1200,
      {
        zoom: 1.7,
        panX: 85,
        panY: 43,
      },
      'cue-99',
    );
    expect(updatePitchTransform).not.toHaveBeenCalled();
  });

  it('removes wheel event listener on unmount', () => {
    const container = document.createElement('div');
    const removeEventListenerSpy = vi.spyOn(container, 'removeEventListener');
    const containerRef = { current: container };

    const { unmount } = renderHook(() =>
      usePreviewWheelZoom({
        containerRef,
        activeCue: undefined,
        resolvedCamera: null,
        activeSlide: null,
        currentTimeMs: 0,
        upsertActionCameraCue: vi.fn(),
        updatePitchTransform: vi.fn(),
      }),
    );

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'wheel',
      expect.any(Function),
    );
  });
});
