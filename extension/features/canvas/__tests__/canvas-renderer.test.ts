import { describe, expect, it, vi } from 'vitest';
import type { CanvasShape } from '../utils/canvas-history';
import { renderCanvasShapes } from '../utils/canvas-renderer';

describe('canvas-renderer', () => {
  it('renders shapes onto canvas 2d context without errors', () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
      arc: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      font: '',
      lineCap: '',
      lineJoin: '',
    } as unknown as CanvasRenderingContext2D;

    const shapes: CanvasShape[] = [
      {
        type: 'pen',
        color: '#EF4444',
        strokeWidth: 4,
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 20 },
        ],
      },
      {
        type: 'arrow',
        color: '#3B82F6',
        strokeWidth: 4,
        from: { x: 0, y: 0 },
        to: { x: 100, y: 100 },
      },
      {
        type: 'line',
        color: '#22C55E',
        strokeWidth: 2,
        from: { x: 10, y: 10 },
        to: { x: 50, y: 50 },
      },
      {
        type: 'rect',
        color: '#FACC15',
        strokeWidth: 3,
        from: { x: 20, y: 20 },
        to: { x: 80, y: 80 },
      },
      {
        type: 'circle',
        color: '#FFFFFF',
        strokeWidth: 2,
        center: { x: 50, y: 50 },
        radius: 30,
      },
      {
        type: 'text',
        color: '#FFFFFF',
        strokeWidth: 1,
        x: 40,
        y: 40,
        text: 'Tactics Note',
        fontSize: 16,
      },
    ];

    expect(() => renderCanvasShapes(mockCtx, shapes)).not.toThrow();
    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
  });
});
