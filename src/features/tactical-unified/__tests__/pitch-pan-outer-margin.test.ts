import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasPitchPan } from '@/features/tactical-unified/objects/canvas/hooks/use-canvas-pitch-pan';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';

describe('L1-Tactical-051: Pitch Outer Margin Pan Guard', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('選択ツール時、ピッチ外枠の内側 (isInsidePitch = true) をクリックするとパンが開始される', () => {
    const store = useTacticalUnifiedStore.getState();
    store.setActiveTool('select');

    const pitchTransformRef = {
      current: { panX: 0, panY: 0, zoom: 1, tilt: 0, isLocked: false },
    };
    const applyPitchTransformToNodes = vi.fn();

    const { result } = renderHook(() =>
      useCanvasPitchPan({
        activeSlideId: store.activeSlideId,
        isPitchLocked: false,
        pitchTransformRef,
        applyPitchTransformToNodes,
      }),
    );

    let handled = false;
    act(() => {
      handled = result.current.handlePointerDown(
        { x: 100, y: 100 },
        true,
        true,
      );
    });

    expect(handled).toBe(true);
    expect(result.current.isPanning).toBe(true);
  });

  it('選択ツール時、ピッチ外枠の外側 (isInsidePitch = false) をクリックしてもパンが開始されない', () => {
    const store = useTacticalUnifiedStore.getState();
    store.setActiveTool('select');

    const pitchTransformRef = {
      current: { panX: 0, panY: 0, zoom: 1, tilt: 0, isLocked: false },
    };
    const applyPitchTransformToNodes = vi.fn();

    const { result } = renderHook(() =>
      useCanvasPitchPan({
        activeSlideId: store.activeSlideId,
        isPitchLocked: false,
        pitchTransformRef,
        applyPitchTransformToNodes,
      }),
    );

    let handled = false;
    act(() => {
      handled = result.current.handlePointerDown({ x: 10, y: 10 }, true, false);
    });

    expect(handled).toBe(false);
    expect(result.current.isPanning).toBe(false);
  });

  it('スペースキー押下中はピッチ外枠の外側 (isInsidePitch = false) でもパンが開始される', () => {
    const store = useTacticalUnifiedStore.getState();
    store.setActiveTool('select');

    const pitchTransformRef = {
      current: { panX: 0, panY: 0, zoom: 1, tilt: 0, isLocked: false },
    };
    const applyPitchTransformToNodes = vi.fn();

    const { result } = renderHook(() =>
      useCanvasPitchPan({
        activeSlideId: store.activeSlideId,
        isPitchLocked: false,
        pitchTransformRef,
        applyPitchTransformToNodes,
      }),
    );

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'Space', key: ' ' }),
      );
    });

    let handled = false;
    act(() => {
      handled = result.current.handlePointerDown({ x: 10, y: 10 }, true, false);
    });

    expect(handled).toBe(true);
    expect(result.current.isPanning).toBe(true);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keyup', { code: 'Space', key: ' ' }),
      );
    });
  });
});
