import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCanvasNodesRegistry } from '@/features/tactical-unified/components/canvas/canvas-registry';
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

    project.slides = [slide1, slide2];
    project.activeSlideId = 'slide-1';
    useTacticalUnifiedStore.getState().loadProject(project);
    useTacticalUnifiedStore.getState().stopPlayback();
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
      useTacticalUnifiedStore.getState().project.slides[0].players[0].id;
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
});
