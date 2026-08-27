export type TacticalDrawTool =
  | 'select'
  | 'arrow_solid'
  | 'arrow_dash'
  | 'zone_circle'
  | 'polygon_zone'
  | 'eraser';

export interface ShapeData {
  id: string;
  type: 'arrow' | 'zone' | 'polygon_zone';
  // Arrow & Polygon properties
  points?: number[]; // [x1, y1, x2, y2, ...]
  isCurved?: boolean;
  controlPoint?: { x: number; y: number };
  // Zone properties
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zoneShape?: 'rect' | 'ellipse';
  fillOpacity?: number;
  // Polygon Zone properties
  isComplete?: boolean;
  // Common properties
  color: string;
  strokeWidth: number;
  dash: number[];
  opacity: number;
  rotation?: number;
}
