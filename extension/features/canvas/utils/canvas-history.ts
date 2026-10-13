export interface Point {
  x: number;
  y: number;
}

export type ShapeType = 'pen' | 'arrow' | 'line' | 'rect' | 'circle' | 'text';

export interface BaseShape {
  type: ShapeType;
  color: string;
  strokeWidth: number;
}

export interface PenShape extends BaseShape {
  type: 'pen';
  points: Point[];
}

export interface ArrowShape extends BaseShape {
  type: 'arrow';
  from: Point;
  to: Point;
}

export interface LineShape extends BaseShape {
  type: 'line';
  from: Point;
  to: Point;
}

export interface RectShape extends BaseShape {
  type: 'rect';
  from: Point;
  to: Point;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  center: Point;
  radius: number;
}

export interface TextShape extends BaseShape {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

export type CanvasShape =
  | PenShape
  | ArrowShape
  | LineShape
  | RectShape
  | CircleShape
  | TextShape;

export interface CanvasHistoryManager {
  push: (shape: CanvasShape) => void;
  undo: () => CanvasShape[];
  redo: () => CanvasShape[];
  clear: () => void;
  setInitialShapes: (shapes: CanvasShape[]) => void;
  getShapes: () => CanvasShape[];
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export function createCanvasHistory(
  initialShapes: CanvasShape[] = [],
): CanvasHistoryManager {
  let past: CanvasShape[][] = [initialShapes];
  let future: CanvasShape[][] = [];

  return {
    push(shape: CanvasShape) {
      const current = past[past.length - 1] || [];
      past.push([...current, shape]);
      future = [];
    },
    undo(): CanvasShape[] {
      if (past.length <= 1) {
        return past[past.length - 1] || [];
      }
      const current = past.pop();
      if (current) {
        future.push(current);
      }
      return past[past.length - 1] || [];
    },
    redo(): CanvasShape[] {
      if (future.length === 0) {
        return past[past.length - 1] || [];
      }
      const next = future.pop();
      if (next) {
        past.push(next);
      }
      return past[past.length - 1] || [];
    },
    clear() {
      past.push([]);
      future = [];
    },
    setInitialShapes(shapes: CanvasShape[]) {
      past = [shapes];
      future = [];
    },
    getShapes(): CanvasShape[] {
      return past[past.length - 1] || [];
    },
    canUndo(): boolean {
      return past.length > 1;
    },
    canRedo(): boolean {
      return future.length > 0;
    },
  };
}
