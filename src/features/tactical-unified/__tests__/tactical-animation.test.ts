import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCanvasNodesRegistry } from '@/features/tactical-unified/core';
import { useTacticalAnimation } from '@/features/tactical-unified/hooks/use-tactical-animation';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  createDefaultProject,
  createDefaultSlide,
} from '@/lib/types/tactical-unified';

describe('useTacticalAnimation hook', () => {
  beforeEach(() => {
    const project = createDefaultProject('test-proj');
    const slide1 = createDefaultSlide(0, 'slide-1');
    slide1.transitionDurationMs = 1000;
    slide1.pauseMs = 500;
    slide1.zones = [
      {
        id: 'z-morph',
        annotationType: 'zone',
        zoneType: 'space',
        shapeType: 'polygon',
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 10 },
          { x: 20, y: 20 },
          { x: 10, y: 20 },
        ],
        color: '#3b82f6',
        opacity: 0.3,
        strokeWidth: 2,
      },
    ];

    const slide2 = createDefaultSlide(1, 'slide-2');
    slide2.transitionDurationMs = 1000;
    slide2.pauseMs = 500;
    slide2.zones = [
      {
        id: 'z-morph',
        annotationType: 'zone',
        zoneType: 'space',
        shapeType: 'polygon',
        points: [
          { x: 30, y: 30 },
          { x: 60, y: 30 },
          { x: 60, y: 60 },
          { x: 30, y: 60 },
        ],
        color: '#ef4444',
        opacity: 0.8,
        strokeWidth: 4,
      },
    ];

    project.phases = [
      {
        id: 'phase-1',
        name: 'Phase 1',
        slides: [slide1, slide2],
      },
      {
        id: 'phase-2',
        name: 'Phase 2',
        slides: [
          createDefaultSlide(0, 'slide-3'),
          {
            ...createDefaultSlide(1, 'slide-4'),
            transitionDurationMs: 2000,
            pauseMs: 1000,
          },
        ],
      },
    ];
    project.activePhaseId = 'phase-1';
    project.activeSlideId = 'slide-1';
    useTacticalUnifiedStore.getState().loadProject(project);
    useTacticalUnifiedStore.getState().stopPlayback();
  });

  it('calculates total duration for active phase only, not across all phases', () => {
    const registry = createCanvasNodesRegistry();
    const registryRef = { current: registry };

    const { result, rerender } = renderHook(() =>
      useTacticalAnimation({ nodesRegistryRef: registryRef }),
    );

    // Phase 1 has slide1 + slide2: 1000ms + 500ms = 1500ms
    expect(result.current.totalDurationMs).toBe(1500);

    // Switch to Phase 2 (slide-3: 2000ms + 1000ms = 3000ms)
    act(() => {
      useTacticalUnifiedStore.getState().setActivePhase('phase-2');
    });
    rerender();

    expect(result.current.totalDurationMs).toBe(3000);
  });

  it('calculates total duration across all slides correctly', () => {
    const registry = createCanvasNodesRegistry();
    const registryRef = { current: registry };

    const { result } = renderHook(() =>
      useTacticalAnimation({ nodesRegistryRef: registryRef }),
    );

    expect(result.current.totalDurationMs).toBe(1500); // 1000ms + 500ms for slide 1
  });

  it('updates Konva nodes on seekTo directly without React state overhead', () => {
    const registry = createCanvasNodesRegistry();

    // Mock Konva zone Line shape
    const mockPointsFn = vi.fn();
    const mockFillFn = vi.fn();
    const mockStrokeFn = vi.fn();
    const mockStrokeWidthFn = vi.fn();

    const mockZoneNode = {
      visible: vi.fn(),
      opacity: vi.fn(),
      points: mockPointsFn,
      fill: mockFillFn,
      stroke: mockStrokeFn,
      strokeWidth: mockStrokeWidthFn,
    } as any;

    registry.zoneNodes.set('z-morph', mockZoneNode);

    // Mock Konva player Group node
    const mockPlayerPositionFn = vi.fn();
    const mockPlayerGroup = {
      position: mockPlayerPositionFn,
      opacity: vi.fn(),
      visible: vi.fn(),
    } as any;

    const firstPlayerId =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0].players[0]
        .id;
    registry.playerNodes.set(firstPlayerId, mockPlayerGroup);

    // Mock Layers
    registry.playerLayer = { batchDraw: vi.fn() } as any;
    registry.ballLayer = { batchDraw: vi.fn() } as any;
    registry.annotationLayer = { batchDraw: vi.fn() } as any;

    const registryRef = { current: registry };

    const { result } = renderHook(() =>
      useTacticalAnimation({ nodesRegistryRef: registryRef }),
    );

    // Seek to 500ms (50% progress between slide 1 and slide 2)
    act(() => {
      result.current.seekTo(500);
    });

    // Verify Zone vertex morphing was applied to Konva node
    expect(mockPointsFn).toHaveBeenCalled();
    const passedPoints = mockPointsFn.mock.calls[0][0];
    expect(passedPoints.length).toBe(8); // 4 vertices * 2 coords
    // At t=0.5: x=10->30 => 20 (px: 20% of 800 = 160)
    expect(passedPoints[0]).toBeCloseTo(160, 1);
    expect(passedPoints[1]).toBeCloseTo(90, 1);

    // Verify Player position was applied
    expect(mockPlayerPositionFn).toHaveBeenCalled();

    // Verify Layers batchDraw was called
    expect(registry.annotationLayer?.batchDraw).toHaveBeenCalled();
    expect(registry.playerLayer?.batchDraw).toHaveBeenCalled();
  });

  it('pauses and stops animation updating store isPlaying state', () => {
    const registry = createCanvasNodesRegistry();
    const registryRef = { current: registry };

    const { result } = renderHook(() =>
      useTacticalAnimation({ nodesRegistryRef: registryRef }),
    );

    act(() => {
      result.current.playAnimation();
    });
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(true);

    act(() => {
      result.current.pauseAnimation();
    });
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);

    act(() => {
      result.current.stopAnimation();
    });
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);
    expect(useTacticalUnifiedStore.getState().activeSlideId).toBe('slide-1');
  });

  it('performs synchronous layer.draw() and stage.draw() when synchronous is true', () => {
    const registry = createCanvasNodesRegistry();
    registry.playerLayer = { draw: vi.fn(), batchDraw: vi.fn() } as any;
    registry.ballLayer = { draw: vi.fn(), batchDraw: vi.fn() } as any;
    registry.annotationLayer = { draw: vi.fn(), batchDraw: vi.fn() } as any;
    registry.backgroundLayer = { draw: vi.fn(), batchDraw: vi.fn() } as any;
    registry.stage = { draw: vi.fn() } as any;

    const registryRef = { current: registry };
    const { result } = renderHook(() =>
      useTacticalAnimation({ nodesRegistryRef: registryRef }),
    );

    // Call applyFrameToCanvas with synchronous = true
    act(() => {
      result.current.applyFrameToCanvas(500, registry, 800, 450, true);
    });

    expect(registry.playerLayer?.draw).toHaveBeenCalled();
    expect(registry.ballLayer?.draw).toHaveBeenCalled();
    expect(registry.annotationLayer?.draw).toHaveBeenCalled();
    expect(registry.backgroundLayer?.draw).toHaveBeenCalled();
    expect(registry.stage?.draw).toHaveBeenCalled();
    expect(registry.playerLayer?.batchDraw).not.toHaveBeenCalled();
  });

  it('calls stage.batchDraw() and layer batchDraw() when synchronous is false', () => {
    const registry = createCanvasNodesRegistry();
    registry.playerLayer = { draw: vi.fn(), batchDraw: vi.fn() } as any;
    registry.ballLayer = { draw: vi.fn(), batchDraw: vi.fn() } as any;
    registry.annotationLayer = { draw: vi.fn(), batchDraw: vi.fn() } as any;
    registry.stage = { draw: vi.fn(), batchDraw: vi.fn() } as any;

    const registryRef = { current: registry };
    const { result } = renderHook(() =>
      useTacticalAnimation({ nodesRegistryRef: registryRef }),
    );

    act(() => {
      result.current.applyFrameToCanvas(500, registry, 800, 450, false);
    });

    expect(registry.playerLayer?.batchDraw).toHaveBeenCalled();
    expect(registry.ballLayer?.batchDraw).toHaveBeenCalled();
    expect(registry.annotationLayer?.batchDraw).toHaveBeenCalled();
    expect(registry.stage?.batchDraw).toHaveBeenCalled();
  });

  it('resets to 0ms and activates first slide when playing from end or initial state (Option B)', () => {
    const registry = createCanvasNodesRegistry();
    const registryRef = { current: registry };
    const { result } = renderHook(() =>
      useTacticalAnimation({ nodesRegistryRef: registryRef }),
    );

    // Initial state: select slide-2
    act(() => {
      useTacticalUnifiedStore.getState().setActiveSlide('slide-2');
    });
    expect(useTacticalUnifiedStore.getState().activeSlideId).toBe('slide-2');

    // Calling playAnimation when currentPlaybackTime is 0 should switch to slide-1
    act(() => {
      result.current.playAnimation();
    });
    expect(useTacticalUnifiedStore.getState().activeSlideId).toBe('slide-1');
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(true);

    // Simulate seeking to end (1500ms) and pausing
    act(() => {
      result.current.seekTo(1500);
      result.current.pauseAnimation();
      useTacticalUnifiedStore.getState().setActiveSlide('slide-2');
    });

    // Calling playAnimation when currentPlaybackTime >= totalDurationMs resets to slide-1
    act(() => {
      result.current.playAnimation();
    });
    expect(useTacticalUnifiedStore.getState().activeSlideId).toBe('slide-1');
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(true);
  });

  it('resumes from snapped playback time when paused midway without resetting to slide-1', () => {
    const registry = createCanvasNodesRegistry();
    const registryRef = { current: registry };
    const { result, rerender } = renderHook(() =>
      useTacticalAnimation({ nodesRegistryRef: registryRef }),
    );

    // Seek to 500ms and pause (snaps to slide-2 at 1000ms)
    act(() => {
      result.current.seekTo(500);
      result.current.pauseAnimation();
    });

    // Resume playing
    act(() => {
      result.current.playAnimation();
    });

    rerender();
    expect(result.current.currentPlaybackTime).toBe(1000);
  });

  it('snaps to next scene and updates activeSlideId when paused midway during slide transition', () => {
    const registry = createCanvasNodesRegistry();
    const registryRef = { current: registry };
    const { result, rerender } = renderHook(() =>
      useTacticalAnimation({ nodesRegistryRef: registryRef }),
    );

    // Seek to 500ms (midway between slide-1 and slide-2)
    act(() => {
      result.current.seekTo(500);
    });

    // Pause animation
    act(() => {
      result.current.pauseAnimation();
    });

    rerender();

    // Should snap to next slide (slide-2), updating activeSlideId and playback indices
    expect(useTacticalUnifiedStore.getState().activeSlideId).toBe('slide-2');
    expect(useTacticalUnifiedStore.getState().playbackSlideIndex).toBe(1);
    expect(
      useTacticalUnifiedStore.getState().playbackTransitionIndex,
    ).toBeNull();
    // Time snapped to transition end (1000ms)
    expect(result.current.currentPlaybackTime).toBe(1000);
  });

  it('remains on current scene when paused during hold/pause time', () => {
    const registry = createCanvasNodesRegistry();
    const registryRef = { current: registry };
    const { result } = renderHook(() =>
      useTacticalAnimation({ nodesRegistryRef: registryRef }),
    );

    // Seek to 1200ms (during slide-2 pause time: 1000ms ~ 1500ms)
    act(() => {
      result.current.seekTo(1200);
    });

    act(() => {
      result.current.pauseAnimation();
    });

    expect(useTacticalUnifiedStore.getState().activeSlideId).toBe('slide-2');
    expect(useTacticalUnifiedStore.getState().playbackSlideIndex).toBe(1);
    expect(
      useTacticalUnifiedStore.getState().playbackTransitionIndex,
    ).toBeNull();
  });

  it('updates playback indices boundary states properly for orange highlight', () => {
    const registry = createCanvasNodesRegistry();
    const registryRef = { current: registry };
    const { result } = renderHook(() =>
      useTacticalAnimation({ nodesRegistryRef: registryRef }),
    );

    // At 500ms: transitioning from slide 0 to slide 1
    act(() => {
      result.current.applyFrameToCanvas(500, registry, 800, 450);
    });
    expect(useTacticalUnifiedStore.getState().playbackSlideIndex).toBe(0);
    expect(useTacticalUnifiedStore.getState().playbackTransitionIndex).toBe(1);

    // At 1200ms: arrived at slide 1, paused
    act(() => {
      result.current.applyFrameToCanvas(1200, registry, 800, 450);
    });
    expect(useTacticalUnifiedStore.getState().playbackSlideIndex).toBe(1);
    expect(
      useTacticalUnifiedStore.getState().playbackTransitionIndex,
    ).toBeNull();
  });
});
