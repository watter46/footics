import { describe, expect, it } from 'vitest';
import { type CanvasShape, createCanvasHistory } from '../utils/canvas-history';

describe('canvas-history', () => {
  const dummyShape1: CanvasShape = {
    type: 'pen',
    color: '#EF4444',
    strokeWidth: 4,
    points: [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ],
  };

  const dummyShape2: CanvasShape = {
    type: 'arrow',
    color: '#3B82F6',
    strokeWidth: 4,
    from: { x: 0, y: 0 },
    to: { x: 50, y: 50 },
  };

  it('initializes with empty shapes and cannot undo/redo', () => {
    const history = createCanvasHistory();
    expect(history.getShapes()).toEqual([]);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it('pushes shapes and handles undo/redo correctly', () => {
    const history = createCanvasHistory();
    history.push(dummyShape1);
    expect(history.getShapes()).toEqual([dummyShape1]);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    history.push(dummyShape2);
    expect(history.getShapes()).toEqual([dummyShape1, dummyShape2]);

    // Undo 1
    const afterUndo1 = history.undo();
    expect(afterUndo1).toEqual([dummyShape1]);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(true);

    // Undo 2
    const afterUndo2 = history.undo();
    expect(afterUndo2).toEqual([]);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    // Redo 1
    const afterRedo1 = history.redo();
    expect(afterRedo1).toEqual([dummyShape1]);
    expect(history.canUndo()).toBe(true);

    // Redo 2
    const afterRedo2 = history.redo();
    expect(afterRedo2).toEqual([dummyShape1, dummyShape2]);
    expect(history.canRedo()).toBe(false);
  });

  it('discards redo stack when pushing a new shape after undo', () => {
    const history = createCanvasHistory();
    history.push(dummyShape1);
    history.undo();
    expect(history.canRedo()).toBe(true);

    history.push(dummyShape2);
    expect(history.canRedo()).toBe(false);
    expect(history.getShapes()).toEqual([dummyShape2]);
  });

  it('clears all shapes and adds to history', () => {
    const history = createCanvasHistory();
    history.push(dummyShape1);
    history.clear();
    expect(history.getShapes()).toEqual([]);
    expect(history.canUndo()).toBe(true);

    history.undo();
    expect(history.getShapes()).toEqual([dummyShape1]);
  });
});
