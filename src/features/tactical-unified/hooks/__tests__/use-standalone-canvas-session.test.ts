import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { useStandaloneCanvasSession } from '../use-standalone-canvas-session';

describe('useStandaloneCanvasSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('initializes store with image background, hides players on pitch, and sets screenshot boundary box', () => {
    const dummyImage = 'data:image/png;base64,mock-screenshot-data';
    renderHook(() =>
      useStandaloneCanvasSession({
        imageDataUrl: dummyImage,
      }),
    );

    const state = useTacticalUnifiedStore.getState();
    const activeSlide = state.project.slides.find(
      (s) => s.id === state.activeSlideId,
    );

    expect(state.project.backgroundType).toBe('image');
    expect(state.project.backgroundImageUrl).toBe(dummyImage);
    expect(activeSlide?.backgroundType).toBe('image');
    expect(activeSlide?.backgroundImageUrl).toBe(dummyImage);
    expect(activeSlide?.ball.visible).toBe(false);

    // Initial players should not be on pitch
    const pitchPlayers = activeSlide?.players.filter((p) => p.area === 'pitch');
    expect(pitchPlayers?.length).toBe(0);

    // BoundaryBox should be enabled and visible
    expect(activeSlide?.boundaryBox?.enabled).toBe(true);
    expect(activeSlide?.boundaryBox?.visible).toBe(true);
  });

  it('restores annotations from initialAnnotations JSON', () => {
    const dummyImage = 'data:image/png;base64,mock-screenshot-data';
    const savedAnnotations = JSON.stringify({
      version: '2.0',
      arrows: [
        {
          id: 'arr-1',
          type: 'solid',
          color: '#ef4444',
          points: [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
          ],
        },
      ],
      zones: [],
      texts: [
        {
          id: 'txt-1',
          annotationType: 'text',
          x: 30,
          y: 40,
          content: 'Tactical analysis note',
        },
      ],
      players: [
        {
          id: 'ring-1',
          area: 'pitch',
          team: 'home',
          x: 50,
          y: 50,
          style: { markerType: 'ring' },
        },
      ],
      boundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
        visible: true,
        fitTarget: 'pitch',
      },
    });

    renderHook(() =>
      useStandaloneCanvasSession({
        imageDataUrl: dummyImage,
        initialAnnotations: savedAnnotations,
      }),
    );

    const state = useTacticalUnifiedStore.getState();
    const activeSlide = state.project.slides.find(
      (s) => s.id === state.activeSlideId,
    );

    expect(activeSlide?.arrows.length).toBe(1);
    expect(activeSlide?.arrows[0].id).toBe('arr-1');
    expect(activeSlide?.texts.length).toBe(1);
    expect(activeSlide?.texts[0].content).toBe('Tactical analysis note');
    expect(activeSlide?.boundaryBox?.width).toBe(80);
  });

  it('watches changes and triggers debounced onSaveAnnotations callback', () => {
    const dummyImage = 'data:image/png;base64,mock-screenshot-data';
    const onSave = vi.fn();

    renderHook(() =>
      useStandaloneCanvasSession({
        imageDataUrl: dummyImage,
        onSaveAnnotations: onSave,
        debounceMs: 300,
      }),
    );

    // Initial setup should not immediately call onSave
    expect(onSave).not.toHaveBeenCalled();

    // Add an arrow to trigger modification
    act(() => {
      const slideId = useTacticalUnifiedStore.getState().activeSlideId;
      useTacticalUnifiedStore.getState().addArrow(slideId, {
        id: 'new-arr',
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        dashArray: [],
        arrowHead: true,
        color: '#3b82f6',
        strokeWidth: 3,
        points: [
          { x: 15, y: 15 },
          { x: 35, y: 35 },
        ],
      });
    });

    // Before debounce timer
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onSave).not.toHaveBeenCalled();

    // After debounce timer expires
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(onSave).toHaveBeenCalledTimes(1);

    const savedJson = onSave.mock.calls[0][0];
    const parsed = JSON.parse(savedJson);
    expect(parsed.arrows.some((a: any) => a.id === 'new-arr')).toBe(true);
  });
});
