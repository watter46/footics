export interface DrawingState {
  isDrawing: boolean;
  tool: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isShift: boolean;
}
