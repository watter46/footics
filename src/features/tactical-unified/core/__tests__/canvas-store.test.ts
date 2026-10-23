import { describe, expect, it } from 'vitest';
import { createCanvasStore } from '../store/canvas-store';
import type { CanvasConfig } from '../types';

describe('canvas-store', () => {
  it('initializes store immediately with config (Zero-Flicker) without players or pitch', () => {
    const initialAnnotations = JSON.stringify({
      arrows: [
        {
          id: 'arrow-1',
          annotationType: 'arrow',
          arrowType: 'pass',
          points: [
            { x: 10, y: 10 },
            { x: 50, y: 50 },
          ],
          color: '#3b82f6',
          strokeWidth: 3,
          dashArray: [],
          arrowHead: true,
        },
      ],
      zones: [],
      texts: [],
      markers: [],
    });

    const config: CanvasConfig = {
      mode: 'screenshot-edit',
      backgroundImageUrl: 'data:image/png;base64,mockImage',
      initialAnnotations,
      markerMode: '3d-only',
    };

    const store = createCanvasStore(config);
    const state = store.getState();

    expect(state.config.mode).toBe('screenshot-edit');
    expect(state.backgroundImageUrl).toBe('data:image/png;base64,mockImage');
    expect(state.markerMode).toBe('3d-only');
    expect(state.annotations.arrows).toHaveLength(1);
    expect(state.annotations.arrows[0]?.id).toBe('arrow-1');
    expect(state.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'canvas',
    });
    expect(state.aspectRatio).toBe('4:5');
  });

  it('initializes with full-tactical mode defaults (fitTarget: pitch, aspectRatio: 4:5)', () => {
    const store = createCanvasStore({ mode: 'full-tactical' });
    const state = store.getState();

    expect(state.aspectRatio).toBe('4:5');
    expect(state.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    });
  });

  it('supports undo and redo for annotation operations', () => {
    const store = createCanvasStore({ mode: 'screenshot-edit' });
    expect(store.getState().canUndo()).toBe(false);

    store.getState().addArrow({
      id: 'arrow-1',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      color: '#ef4444',
      strokeWidth: 3,
      dashArray: [],
      arrowHead: true,
    });

    expect(store.getState().annotations.arrows).toHaveLength(1);
    expect(store.getState().canUndo()).toBe(true);

    store.getState().undo();
    expect(store.getState().annotations.arrows).toHaveLength(0);
    expect(store.getState().canUndo()).toBe(false);

    store.getState().redo();
    expect(store.getState().annotations.arrows).toHaveLength(1);
  });

  it('allows updating boundaryBox with undo support', () => {
    const store = createCanvasStore({ mode: 'screenshot-edit' });
    store.getState().setBoundaryBox({
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      enabled: true,
      visible: true,
    });

    expect(store.getState().boundaryBox.x).toBe(10);
    store.getState().undo();
    expect(store.getState().boundaryBox.x).toBe(0);
  });

  it('toggles and preserves continuousDrawing flag', () => {
    const store = createCanvasStore({ mode: 'screenshot-edit' });
    expect(store.getState().continuousDrawing).toBe(false);

    store.getState().setContinuousDrawing(true);
    expect(store.getState().continuousDrawing).toBe(true);

    store.getState().toggleContinuousDrawing();
    expect(store.getState().continuousDrawing).toBe(false);

    store.getState().toggleContinuousDrawing();
    expect(store.getState().continuousDrawing).toBe(true);
  });

  it('safely switches between all 19 DrawingTools', () => {
    const store = createCanvasStore({ mode: 'screenshot-edit' });
    const tools = [
      'select',
      'line',
      'route_line',
      'arrow_solid',
      'arrow_dash',
      'arrow_wavy',
      'zone_circle',
      'polygon_zone',
      'eraser',
      'player',
      'player-ring',
      'arrow-straight',
      'arrow-curved',
      'zone',
      'text',
      'badge',
      'vision-cone',
      'connect-line',
      'pan',
    ] as const;

    expect(tools).toHaveLength(19);
    for (const tool of tools) {
      store.getState().setActiveTool(tool);
      expect(store.getState().activeTool).toBe(tool);
    }
  });

  it('accurately erases arrows, polygons, and texts with eraseAtPoint', () => {
    const store = createCanvasStore({ mode: 'screenshot-edit' });

    store.getState().addArrow({
      id: 'arrow-erase-1',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      color: '#ef4444',
      strokeWidth: 3,
      dashArray: [],
      arrowHead: true,
    });

    store.getState().addArrow({
      id: 'arrow-far',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 80, y: 80 },
        { x: 90, y: 90 },
      ],
      color: '#ef4444',
      strokeWidth: 3,
      dashArray: [],
      arrowHead: true,
    });

    store.getState().addZone({
      id: 'zone-polygon-1',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'polygon',
      points: [
        { x: 30, y: 30 },
        { x: 50, y: 30 },
        { x: 50, y: 50 },
        { x: 30, y: 50 },
      ],
      color: '#3b82f6',
      opacity: 0.3,
      strokeColor: '#3b82f6',
      strokeWidth: 2,
    });

    store.getState().addText({
      id: 'text-1',
      annotationType: 'text',
      x: 15,
      y: 15,
      content: 'Pressing',
      fontSize: 16,
      color: '#ffffff',
      bold: false,
      italic: false,
    });

    expect(store.getState().annotations.arrows).toHaveLength(2);
    expect(store.getState().annotations.zones).toHaveLength(1);
    expect(store.getState().annotations.texts).toHaveLength(1);

    // 1. (15, 15) 付近を消去 -> arrow-erase-1 と text-1 が消去され、arrow-far と zone-polygon-1 は残る
    store.getState().eraseAtPoint({ x: 15, y: 15 }, 4);
    expect(store.getState().annotations.arrows.map((a) => a.id)).toEqual([
      'arrow-far',
    ]);
    expect(store.getState().annotations.texts).toHaveLength(0);
    expect(store.getState().annotations.zones).toHaveLength(1);

    // 2. 多角形ゾーン内部 (40, 40) を消去 -> zone-polygon-1 が消去される
    store.getState().eraseAtPoint({ x: 40, y: 40 }, 4);
    expect(store.getState().annotations.zones).toHaveLength(0);
    expect(store.getState().annotations.arrows).toHaveLength(1);

    // 3. Undo で復元
    store.getState().undo();
    expect(store.getState().annotations.zones).toHaveLength(1);
    store.getState().undo();
    expect(store.getState().annotations.arrows).toHaveLength(2);
    expect(store.getState().annotations.texts).toHaveLength(1);
  });

  it('supports clipboard actions (copy, paste, duplicate)', () => {
    const store = createCanvasStore({ mode: 'screenshot-edit' });
    store.getState().addArrow({
      id: 'arrow-clip-1',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      color: '#ef4444',
      strokeWidth: 3,
      dashArray: [],
      arrowHead: true,
    });

    store.getState().selectObject({ id: 'arrow-clip-1', kind: 'arrow' });
    expect(store.getState().selectedObjects).toEqual([
      { id: 'arrow-clip-1', kind: 'arrow' },
    ]);

    store.getState().copySelectedObjects();
    store.getState().pasteObjects();

    expect(store.getState().annotations.arrows).toHaveLength(2);
    const pastedArrow = store.getState().annotations.arrows[1];
    expect(pastedArrow?.id).not.toBe('arrow-clip-1');
    expect(store.getState().selectedObjects).toEqual([
      { id: pastedArrow?.id, kind: 'arrow' },
    ]);

    store.getState().duplicateSelectedObjects();
    expect(store.getState().annotations.arrows).toHaveLength(3);
  });

  it('manages pitchTransform and lock state', () => {
    const store = createCanvasStore({ mode: 'screenshot-edit' });
    expect(store.getState().pitchTransform).toEqual({
      panX: 0,
      panY: 0,
      zoom: 1,
      tilt: 0,
      isLocked: false,
    });

    store.getState().setPitchTransform({ zoom: 1.5, panX: 20 });
    expect(store.getState().pitchTransform.zoom).toBe(1.5);
    expect(store.getState().pitchTransform.panX).toBe(20);

    store.getState().setPitchLocked(true);
    expect(store.getState().pitchTransform.isLocked).toBe(true);

    store.getState().resetPitchTransform();
    expect(store.getState().pitchTransform).toEqual({
      panX: 0,
      panY: 0,
      zoom: 1,
      tilt: 0,
      isLocked: false,
    });
  });
});
