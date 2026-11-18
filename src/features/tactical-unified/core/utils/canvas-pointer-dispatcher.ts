import type { KonvaEventObject } from 'konva/lib/Node';
import { toScreenNormPoint } from '@/lib/types/tactical/branded';
import type {
  DomainArrowAnnotation,
  DomainZoneAnnotation,
} from '@/lib/types/tactical/domain-entities';
import type { DrawingPreviewState, DrawingTool } from '../types';
import type { PitchTransformState } from './canvas-coordinates';
import { commitDrawingShape } from './canvas-drawing-factory';
import type { CanvasNodesRegistry } from './canvas-registry';
import type { SelectionBox } from './canvas-selection-helpers';
import { getPointerCoordinates } from './geometry';

export interface UseCanvasPointerInteractionOptions {
  vRect: { width: number; height: number };
  containerRef?: React.RefObject<HTMLDivElement | null>;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
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
  onRotateMove: (
    pixelPos: { x: number; y: number },
    isAnchor?: boolean,
    stageContainer?: HTMLDivElement | null,
  ) => boolean;
  onPolygonMove: (normPos: { x: number; y: number }) => boolean;
  onSelectionMove: (pixelPos: { x: number; y: number }) => boolean;
  eraseAtPoint: (normPos: { x: number; y: number }, radius: number) => void;
  setDrawingPreview: (p: DrawingPreviewState | null) => void;
}

export function isAnchorTarget(
  target: KonvaEventObject<PointerEvent>['target'] | null | undefined,
): boolean {
  if (!target) return false;
  const name = typeof target.name === 'function' ? target.name() : '';
  if (typeof name === 'string' && name.includes('_anchor')) return true;
  const parent =
    typeof target.getParent === 'function' ? target.getParent() : null;
  const className =
    parent && typeof parent.getClassName === 'function'
      ? parent.getClassName()
      : '';
  return className === 'Transformer';
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
  const isAnchor = isAnchorTarget(e.target);
  const stageContainer = e.target?.getStage?.()?.container?.() ?? null;
  if (opts.onRotateMove(pixelPos, isAnchor, stageContainer)) return;
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
  addArrow: (a: DomainArrowAnnotation) => void;
  addZone: (z: DomainZoneAnnotation) => void;
  setDrawingPreview: (p: DrawingPreviewState | null) => void;
  setActiveTool: (tool: DrawingTool) => void;
}

export function dispatchPointerUp(opts: DispatcherUpOptions): void {
  if (opts.onPanUp()) return;
  if (opts.onRotateUp()) return;
  if (opts.onSelectionUp()) return;
  if (opts.drawingPreview?.isDrawing) {
    commitDrawingShape(
      {
        tool: opts.drawingPreview.tool,
        startPoint: toScreenNormPoint(
          opts.drawingPreview.startX,
          opts.drawingPreview.startY,
        ),
        currentPoint: toScreenNormPoint(
          opts.drawingPreview.currentX,
          opts.drawingPreview.currentY,
        ),
      },
      opts.color,
      opts.strokeWidth,
      opts.addArrow,
      opts.addZone,
    );
    opts.setDrawingPreview(null);
    if (!opts.continuousDrawing) opts.setActiveTool('select');
  }
}
