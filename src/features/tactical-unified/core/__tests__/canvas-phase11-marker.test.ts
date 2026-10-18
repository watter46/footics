import { describe, expect, it, vi } from 'vitest';
import type { ArrowAnnotation } from '@/lib/types/tactical-unified';
import { updateAttachedArrowPositions } from '../components/annotations/arrow-drag-updater';
import { resolveDynamicArrowPoints } from '../components/annotations/arrow-geometry';
import { createCanvasStore } from '../store/canvas-store';
import {
  create2DPlayerMarker,
  createRingMarker,
} from '../utils/canvas-drawing-factory';
import { handleToolPointerDown } from '../utils/canvas-pointer-tools';

function makeArrow(
  id: string,
  opts: Partial<ArrowAnnotation> = {},
): ArrowAnnotation {
  return {
    id,
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
    endMarker: 'arrow',
    ...opts,
  };
}

describe('canvas-phase11-marker: Marker Default Color, Cascade Deletion, and Wavy Arrow', () => {
  it('1. createRingMarker & create2DPlayerMarker have default color #034694', () => {
    const ring = createRingMarker(20, 30);
    expect(ring.style?.color).toBe('#034694');

    const player = create2DPlayerMarker(40, 50, undefined, '7');
    expect(player.style?.color).toBe('#034694');

    const store = createCanvasStore({ mode: 'screenshot-edit' });
    store.getState().setActiveTool('player');
    const state = store.getState();
    handleToolPointerDown({ x: 10, y: 10 }, {
      activeTool: 'player',
      markers: state.annotations.markers,
      continuousDrawing: false,
      setActiveTool: state.setActiveTool,
      setDrawingPreview: state.setDrawingPreview,
      addText: state.addText,
      addMarker: state.addMarker,
      eraseAtPoint: state.eraseAtPoint,
    } as unknown as Parameters<typeof handleToolPointerDown>[1]);

    const createdMarker = store.getState().annotations.markers[0];
    expect(createdMarker).toBeDefined();
    expect(createdMarker?.style?.color).toBe('#034694');
  });

  it('2. removeMarker cascades deletion to attached arrows and connect lines', () => {
    const store = createCanvasStore({ mode: 'screenshot-edit' });
    const p1 = { ...createRingMarker(10, 10), id: 'p-1' };
    const p2 = { ...createRingMarker(30, 30), id: 'p-2' };
    const p3 = { ...createRingMarker(50, 50), id: 'p-3' };
    store.getState().addMarker(p1);
    store.getState().addMarker(p2);
    store.getState().addMarker(p3);

    store.getState().updateMarker('p-2', {
      connectLines: [
        {
          id: 'cl-21',
          toPlayerId: 'p-1',
          lineStyle: 'solid',
          color: '#034694',
          strokeWidth: 2,
          visible: true,
        },
        {
          id: 'cl-23',
          toPlayerId: 'p-3',
          lineStyle: 'solid',
          color: '#034694',
          strokeWidth: 2,
          visible: true,
        },
      ],
    });

    const s = store.getState();
    s.addArrow(makeArrow('arrow-src-p1', { sourcePlayerId: 'p-1' }));
    s.addArrow(makeArrow('arrow-tgt-p1', { targetPlayerId: 'p-1' }));
    s.addArrow(makeArrow('arrow-independent'));

    store.getState().removeMarker('p-1');

    const state = store.getState();
    expect(
      state.annotations.markers.find((m) => m.id === 'p-1'),
    ).toBeUndefined();
    const updatedP2 = state.annotations.markers.find((m) => m.id === 'p-2');
    expect(updatedP2?.connectLines).toHaveLength(1);
    expect(updatedP2?.connectLines?.[0]?.toPlayerId).toBe('p-3');

    const remainingArrowIds = state.annotations.arrows.map((a) => a.id);
    expect(remainingArrowIds).not.toContain('arrow-src-p1');
    expect(remainingArrowIds).not.toContain('arrow-tgt-p1');
    expect(remainingArrowIds).toContain('arrow-independent');
  });

  it('3. removeSelected cascades deletion for multiple selected markers', () => {
    const store = createCanvasStore({ mode: 'screenshot-edit' });
    const p1 = { ...createRingMarker(10, 10), id: 'sel-1' };
    const p2 = { ...createRingMarker(20, 20), id: 'sel-2' };
    store.getState().addMarker(p1);
    store.getState().addMarker(p2);
    store.getState().addArrow(
      makeArrow('arrow-to-sel-2', {
        sourcePlayerId: 'sel-1',
        targetPlayerId: 'sel-2',
      }),
    );

    store.getState().selectObject('sel-1');
    store.getState().removeSelected();

    const state = store.getState();
    expect(
      state.annotations.markers.find((m) => m.id === 'sel-1'),
    ).toBeUndefined();
    expect(
      state.annotations.arrows.find((a) => a.id === 'arrow-to-sel-2'),
    ).toBeUndefined();
  });

  it('4. WavyArrow generation & boundary attachment points', () => {
    const p = { ...createRingMarker(50, 50), id: 'player-wavy' };
    const wavyArrow = makeArrow('arrow-wavy', {
      arrowType: 'dribble',
      sourcePlayerId: p.id,
      color: '#eab308',
    });

    expect(wavyArrow.color).toBe('#eab308');
    expect(wavyArrow.arrowType).toBe('dribble');

    const points = resolveDynamicArrowPoints({
      sx: 400,
      sy: 300,
      ex: 500,
      ey: 300,
      isCurved: false,
      isWavy: true,
      isDotEnd: false,
      dotRadius: 5,
      sourcePlayer: p,
      stageSize: { width: 800, height: 600 },
    });

    expect(points.length).toBeGreaterThan(4);
    expect(points[0]).toBeGreaterThan(400);
  });

  it('5. updateAttachedArrowPositions updates Konva arrow node during marker drag', () => {
    const p1 = { ...createRingMarker(10, 10), id: 'p-drag' };
    const arrow = makeArrow('a-attached', {
      arrowType: 'dribble',
      sourcePlayerId: 'p-drag',
      color: '#eab308',
    });

    const mockPointsFn = vi.fn();
    const mockBatchDraw = vi.fn();
    const mockNode = {
      points: mockPointsFn,
      getLayer: () => ({ batchDraw: mockBatchDraw }),
    };

    const arrowNodesMap = new Map();
    arrowNodesMap.set('a-attached', { node: mockNode });

    updateAttachedArrowPositions(
      arrowNodesMap,
      [arrow],
      [p1],
      'p-drag',
      120,
      120,
      800,
      600,
    );

    expect(mockPointsFn).toHaveBeenCalledTimes(1);
    expect(mockBatchDraw).toHaveBeenCalledTimes(1);
  });
});
