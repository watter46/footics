import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTacticalUnifiedStore,
  type TacticalUnifiedStoreApi,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import type { Player } from '@/lib/types/tactical-unified';
import { createPreviewCanvasStoreAdapter } from '../preview-canvas-store-adapter';

function createDummyPlayer(id: string, x: number, y: number): Player {
  return {
    id,
    x,
    y,
    team: 'home',
    area: 'pitch',
    name: `Player ${id}`,
    shirtNo: '10',
    connectLines: [],
    badges: [],
    style: {
      markerType: 'circle',
      insideContent: 'number',
      bottomLabel: 'name',
      color: '#ff0000',
      strokeColor: '#ffffff',
      strokeWidth: 2,
      sizeScale: 1,
      numberSizeScale: 1,
      labelSizeScale: 1,
    },
  };
}

describe('preview-canvas-store-adapter', () => {
  let store: TacticalUnifiedStoreApi;

  beforeEach(() => {
    store = createTacticalUnifiedStore();
    store.getState().resetProject();
  });

  it('reflects activeSlide annotations and ball when stopped (playbackTime === null) and sets cameraTransform to null if camera is default', () => {
    const slide = store.getState().project.phases[0].slides[0];
    const player = createDummyPlayer('p1', 30, 40);
    store.getState().updateSlide(slide.id, {
      players: [player],
      ball: { x: 45, y: 55, visible: true },
      pitchTransform: {
        tilt: 0,
        yaw: 90,
        zoom: 1,
        panX: 0,
        panY: 0,
        isLocked: false,
      },
    });

    const adapter = createPreviewCanvasStoreAdapter(store);
    expect(adapter.getPlaybackTime()).toBeNull();

    const state = adapter.getState();
    expect(state.cameraTransform).toBeNull();
    expect(state.annotations.markers).toHaveLength(1);
    expect(state.annotations.markers[0].x).toBe(30);
    expect(state.annotations.markers[0].y).toBe(40);
    expect(state.ball).toEqual({ x: 45, y: 55, visible: true });
  });

  it('projects coordinates and sets cameraTransform when camera is non-default while stopped', () => {
    const slide = store.getState().project.phases[0].slides[0];
    const player = createDummyPlayer('p1', 50, 80);
    store.getState().updateSlide(slide.id, {
      players: [player],
      pitchTransform: {
        tilt: 30,
        yaw: 60,
        zoom: 1.2,
        panX: 10,
        panY: -10,
        isLocked: false,
      },
    });

    const adapter = createPreviewCanvasStoreAdapter(store);
    const state = adapter.getState();

    expect(state.cameraTransform).toEqual({
      tilt: 30,
      yaw: 60,
      zoom: 1.2,
      panX: 10,
      panY: -10,
      isLocked: false,
    });
    // With 3D projection, projected coordinates should differ from (50, 80)
    expect(state.annotations.markers[0].x).not.toBe(50);
    expect(state.annotations.markers[0].y).not.toBe(80);
  });

  it('reflects interpolated state and camera when setPlaybackTime is called', () => {
    const slide1 = store.getState().project.phases[0].slides[0];
    const p1A = createDummyPlayer('p1', 20, 20);
    store.getState().updateSlide(slide1.id, {
      players: [p1A],
      transitionDurationMs: 1000,
      pitchTransform: {
        tilt: 0,
        yaw: 90,
        zoom: 1,
        panX: 0,
        panY: 0,
        isLocked: false,
      },
    });

    // Add slide 2
    store.getState().addSlide(slide1.id, 'blank');
    const slide2 = store.getState().project.phases[0].slides[1];
    const p1B = createDummyPlayer('p1', 40, 40);
    store.getState().updateSlide(slide2.id, {
      players: [p1B],
      transitionDurationMs: 1000,
      pitchTransform: {
        tilt: 40,
        yaw: 90,
        zoom: 1,
        panX: 0,
        panY: 0,
        isLocked: false,
      },
    });

    const adapter = createPreviewCanvasStoreAdapter(store);
    adapter.setPlaybackTime(500);

    expect(adapter.getPlaybackTime()).toBe(500);
    const state = adapter.getState();

    // Camera is interpolated between tilt 0 and 40 -> tilt ~20
    expect(state.cameraTransform).not.toBeNull();
    expect(state.cameraTransform?.tilt).toBeGreaterThan(0);
    expect(state.cameraTransform?.tilt).toBeLessThan(40);

    // Player position should be projected based on interpolated point (close to 30, 30)
    expect(state.annotations.markers).toHaveLength(1);
    expect(state.annotations.markers[0].id).toBe('p1');
  });

  it('skips listener notification when only editor-specific UI states change and playbackTime is null', () => {
    const adapter = createPreviewCanvasStoreAdapter(store);
    const listener = vi.fn();
    const unsubscribe = adapter.subscribe(listener);

    // Change editor UI states: selectedObjects, isHudOpen, drawingPreview
    store.getState().selectObject({ id: 'some-id', kind: 'player' });
    store.getState().setIsHudOpen(true);
    store.getState().setDrawingPreview({
      isDrawing: true,
      tool: 'select',
      startX: 10,
      startY: 10,
      currentX: 20,
      currentY: 20,
    });

    expect(listener).not.toHaveBeenCalled();

    // Now change slide pitchTransform (which preview cares about)
    const activeSlide = store.getState().project.phases[0].slides[0];
    store.getState().updatePitchTransform(activeSlide.id, { tilt: 15 });

    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });
});
