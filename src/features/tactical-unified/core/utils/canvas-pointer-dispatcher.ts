import type { KonvaEventObject } from 'konva/lib/Node';
import type {
  ArrowAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type { DrawingPreviewState, DrawingTool } from '../types';
import type { PitchTransformState } from './canvas-coordinates';
import { commitDrawingShape } from './canvas-drawing-factory';
import type { SelectionBox } from './canvas-selection-helpers';
import { getPointerCoordinates } from './geometry';

export interface UseCanvasPointerInteractionOptions {
  vRect: { width: number; height: number };
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onStartEditText?: (textId: string) => void;
}

export interface CanvasPointerInteractionResult {
  drawingState: DrawingPreviewState | null;
  selectionBox: SelectionBox | null;
  activePolygonId: string | null;
  mousePreviewPos: { x: number; y: number } | null;
  isPitchLocked: boolean;
  isPanning: boolean;
  isSpacePressed: boolean;
  handleWheel: (e: KonvaEventObject<WheelEvent>) => void;
  handlePointerDown: (e: KonvaEventObject<PointerEvent>) => void;
  handlePointerMove: (e: KonvaEventObject<PointerEvent>) => void;
  handlePointerUp: (e?: KonvaEventObject<PointerEvent>) => void;
}

export interface DispatcherMoveOptions {
  vRect: { width: number; height: number };
  pitchTransform?: PitchTransformState;
  isPointerDown: boolean;
  activeTool: DrawingTool;
  drawingPreview: DrawingPreviewState | null;
  onPanMove: (e: KonvaEventObject<PointerEvent>) => boolean;
  onRotateMove: (pixelPos: { x: number; y: number }) => boolean;
  onPolygonMove: (normPos: { x: number; y: number }) => boolean;
  onSelectionMove: (pixelPos: { x: number; y: number }) => boolean;
  eraseAtPoint: (normPos: { x: number; y: number }, radius: number) => void;
  setDrawingPreview: (p: DrawingPreviewState | null) => void;
}

export function dispatchPointerMove(
  e: KonvaEventObject<PointerEvent>,
  opts: DispatcherMoveOptions,
): void {
  if (opts.onPanMove(e)) return;
  const { pixelPos, normPos } = getPointerCoordinates(
    e,
    opts.vRect,
    opts.pitchTransform,
  );
  if (opts.onRotateMove(pixelPos)) return;
  if (opts.onPolygonMove(normPos)) return;
  if (opts.onSelectionMove(pixelPos)) return;

  if (opts.activeTool === 'eraser' && opts.isPointerDown) {
    opts.eraseAtPoint(normPos, 4);
    return;
  }
  if (opts.drawingPreview?.isDrawing) {
    opts.setDrawingPreview({
      ...opts.drawingPreview,
      currentX: normPos.x,
      currentY: normPos.y,
    });
  }
}

export interface DispatcherUpOptions {
  drawingPreview: DrawingPreviewState | null;
  color: string;
  strokeWidth: number;
  continuousDrawing: boolean;
  onPanUp: () => boolean;
  onRotateUp: () => boolean;
  onSelectionUp: () => boolean;
  addArrow: (a: ArrowAnnotation) => void;
  addZone: (z: ZoneAnnotation) => void;
  setDrawingPreview: (p: DrawingPreviewState | null) => void;
  setActiveTool: (tool: DrawingTool) => void;
}

export function dispatchPointerUp(opts: DispatcherUpOptions): void {
  if (opts.onPanUp()) return;
  if (opts.onRotateUp()) return;
  if (opts.onSelectionUp()) return;
  if (opts.drawingPreview?.isDrawing) {
    commitDrawingShape(
      opts.drawingPreview,
      opts.color,
      opts.strokeWidth,
      opts.addArrow,
      opts.addZone,
    );
    opts.setDrawingPreview(null);
    if (!opts.continuousDrawing) opts.setActiveTool('select');
  }
}
