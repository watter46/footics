export type TacticalDrawTool =
  | 'select'
  | 'arrow_solid'
  | 'arrow_dash'
  | 'zone_circle'
  | 'eraser';

export interface ShapeData {
  id: string;
  type: 'arrow' | 'zone';
  // Arrow properties
  points?: number[]; // [x1, y1, x2, y2]
  isCurved?: boolean;
  controlPoint?: { x: number; y: number };
  // Zone properties
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zoneShape?: 'rect' | 'ellipse';
  fillOpacity?: number;
  // Common properties
  color: string;
  strokeWidth: number;
  dash: number[];
  opacity: number;
  rotation?: number;
}
