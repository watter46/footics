'use client';

import type { ReactNode } from 'react';
import { Ellipse, Group, Rect as KonvaRect, Layer, Line } from 'react-konva';
import type {
  ResolvedArrowPrimitive,
  ResolvedDrawingPreview,
  ResolvedSceneGraphDTO,
  ResolvedZonePrimitive,
} from '@/lib/tactical/compiler/scene-graph-dto';
import type { SelectionBox } from '../hooks/use-canvas-selection-box';
import { useCanvasStore } from '../hooks/use-canvas-store';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import { calculatePitchTransform } from '../utils/canvas-pitch-transform-helper';
import type { CameraState } from '../utils/matrix-coordinates';
import { renderDrawingPreviewNode } from './DrawingPreviewLayer';
import { PlayerConnectingGuide } from './PlayerConnectingGuide';

export type DrawingPreviewDTO =
  | ResolvedArrowPrimitive
  | ResolvedZonePrimitive
  | ResolvedDrawingPreview;

export type PreviewSceneGraph =
  | (Omit<ResolvedSceneGraphDTO, 'drawingPreview'> & {
      readonly drawingPreview?: DrawingPreviewDTO | null;
    })
  | ResolvedSceneGraphDTO;

export interface InteractionPreviewLayerProps {
  stageSize: { width: number; height: number };
  pitchRect: PitchRectBounds;
  camera?: Partial<CameraState>;
  selectionBox?: SelectionBox | null;
  activePolygonId?: string | null;
  mousePreviewPos?: { x: number; y: number } | null;
  cleanRender?: boolean;
  sceneGraph?: PreviewSceneGraph | null;
}

function isZonePrimitive(
  preview: DrawingPreviewDTO,
): preview is ResolvedZonePrimitive {
  return 'shapeType' in preview;
}

function isArrowPrimitive(
  preview: DrawingPreviewDTO,
): preview is ResolvedArrowPrimitive {
  return (
    'flatPointsPx' in preview &&
    !('shapeType' in preview) &&
    'strokeWidthPx' in preview
  );
}

function renderSceneGraphDrawingPreview(preview: DrawingPreviewDTO): ReactNode {
  if (isZonePrimitive(preview)) {
    if (preview.shapeType === 'ellipse') {
      const widthPx = preview.widthPx ?? 0;
      const heightPx = preview.heightPx ?? 0;
      return (
        <Ellipse
          x={(preview.xPx ?? 0) + widthPx / 2}
          y={(preview.yPx ?? 0) + heightPx / 2}
          radiusX={widthPx / 2}
          radiusY={heightPx / 2}
          fill={preview.color}
          opacity={preview.opacity}
          stroke={preview.strokeColor}
          strokeWidth={preview.strokeWidthPx}
          listening={false}
        />
      );
    }
    if (preview.shapeType === 'rect') {
      return (
        <KonvaRect
          x={preview.xPx ?? 0}
          y={preview.yPx ?? 0}
          width={preview.widthPx ?? 0}
          height={preview.heightPx ?? 0}
          fill={preview.color}
          opacity={preview.opacity}
          stroke={preview.strokeColor}
          strokeWidth={preview.strokeWidthPx}
          listening={false}
        />
      );
    }
    if (preview.shapeType === 'polygon') {
      return (
        <Line
          points={[...(preview.flatPointsPx ?? [])]}
          stroke={preview.strokeColor}
          strokeWidth={preview.strokeWidthPx}
          closed={false}
          listening={false}
        />
      );
    }
  }

  if (isArrowPrimitive(preview)) {
    return (
      <Line
        points={[...preview.flatPointsPx]}
        stroke={preview.color}
        strokeWidth={preview.strokeWidthPx}
        dash={
          preview.dashArrayPx.length > 0 ? [...preview.dashArrayPx] : undefined
        }
        opacity={preview.opacity}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
    );
  }

  if ('flatPolygonPointsPx' in preview && preview.flatPolygonPointsPx) {
    return (
      <Line
        points={[...preview.flatPolygonPointsPx]}
        stroke="#ffffff"
        strokeWidth={2}
        listening={false}
      />
    );
  }
  if ('startPointPx' in preview && 'currentPointPx' in preview) {
    return (
      <Line
        points={[
          preview.startPointPx.x,
          preview.startPointPx.y,
          preview.currentPointPx.x,
          preview.currentPointPx.y,
        ]}
        stroke="#ffffff"
        strokeWidth={2}
        listening={false}
      />
    );
  }

  return null;
}

export function InteractionPreviewLayer({
  pitchRect,
  selectionBox,
  cleanRender,
  sceneGraph,
}: InteractionPreviewLayerProps): ReactNode {
  const drawingPreview = useCanvasStore((s) => s.drawingPreview);
  const color = useCanvasStore((s) => s.color);
  const strokeWidth = useCanvasStore((s) => s.strokeWidth);
  const connectingPlayerId = useCanvasStore((s) => s.connectingPlayerId);
  const markers = useCanvasStore((s) => s.annotations.markers);
  const teamVisibility = useCanvasStore((s) => s.teamVisibility ?? 'both');
  const pitchTransform = useCanvasStore((s) => s.pitchTransform);

  const groupTransform = calculatePitchTransform(
    pitchRect,
    pitchTransform.panX,
    pitchTransform.panY,
    pitchTransform.zoom,
    0,
  );

  if (cleanRender) return null;
  const visibleMarkers =
    teamVisibility === 'both'
      ? markers
      : markers.filter(
          (m) => m.team === teamVisibility || m.team === 'neutral',
        );

  const pw = pitchRect.width;
  const ph = pitchRect.height;
  const baseDim = Math.min(pw, ph);

  return (
    <Layer id="interaction-preview-layer" listening={false}>
      {/* 範囲選択矩形 (Stage 座標系基準) */}
      {selectionBox && (
        <KonvaRect
          x={Math.min(selectionBox.startX, selectionBox.currentX)}
          y={Math.min(selectionBox.startY, selectionBox.currentY)}
          width={Math.abs(selectionBox.currentX - selectionBox.startX)}
          height={Math.abs(selectionBox.currentY - selectionBox.startY)}
          fill="rgba(56, 189, 248, 0.12)"
          stroke="#38bdf8"
          strokeWidth={1}
          dash={[4, 3]}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* ピッチ枠座標系基準の描画プレビュー・接続ガイド */}
      <Group
        x={groupTransform.x}
        y={groupTransform.y}
        scaleX={groupTransform.scaleX}
        scaleY={groupTransform.scaleY}
        listening={false}
      >
        {connectingPlayerId && (
          <PlayerConnectingGuide
            connectingPlayerId={connectingPlayerId}
            markers={visibleMarkers}
            width={pw}
            height={ph}
            baseDim={baseDim}
          />
        )}

        {sceneGraph?.drawingPreview != null
          ? renderSceneGraphDrawingPreview(sceneGraph.drawingPreview)
          : renderDrawingPreviewNode(
              drawingPreview,
              pw,
              ph,
              color,
              strokeWidth,
            )}
      </Group>
    </Layer>
  );
}
