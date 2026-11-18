'use client';

import { memo, type ReactNode } from 'react';
import {
  Arrow,
  Circle,
  Ellipse,
  Group,
  Rect as KonvaRect,
  Layer,
  Line,
} from 'react-konva';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { compileDrawingPreview } from '@/lib/tactical/compiler/compile-zones';
import type {
  ResolvedArrowPrimitive,
  ResolvedDrawingPreview,
  ResolvedZonePrimitive,
} from '@/lib/tactical/compiler/scene-graph-dto';
import type { SelectionBox } from '../hooks/use-canvas-selection-box';
import {
  type PitchRectBounds,
  resolvePitchGroupTransform,
} from '../utils/canvas-coordinates';
import { PlayerConnectingGuide } from './PlayerConnectingGuide';

export type DrawingPreviewDTO =
  | ResolvedArrowPrimitive
  | ResolvedZonePrimitive
  | ResolvedDrawingPreview;

export interface InteractionPreviewLayerProps {
  stageSize: { width: number; height: number };
  pitchRect: PitchRectBounds;
  selectionBox?: SelectionBox | null;
  cleanRender?: boolean;
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
          dash={[4, 4]}
          listening={false}
          perfectDrawEnabled={false}
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
          dash={[4, 4]}
          cornerRadius={4}
          listening={false}
          perfectDrawEnabled={false}
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
    const dash =
      preview.dashArrayPx.length > 0 ? [...preview.dashArrayPx] : undefined;

    if (preview.endMarker === 'arrow') {
      return (
        <Arrow
          points={[...preview.flatPointsPx]}
          stroke={preview.color}
          fill={preview.color}
          strokeWidth={preview.strokeWidthPx}
          dash={dash}
          pointerLength={preview.pointerLengthPx}
          pointerWidth={preview.pointerWidthPx}
          opacity={preview.opacity}
          lineCap="round"
          lineJoin="round"
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }

    const lineNode = (
      <Line
        points={[...preview.flatPointsPx]}
        stroke={preview.color}
        strokeWidth={preview.strokeWidthPx}
        dash={dash}
        opacity={preview.opacity}
        lineCap="round"
        lineJoin="round"
        listening={false}
        perfectDrawEnabled={false}
      />
    );

    if (preview.startMarker === 'dot' || preview.endMarker === 'dot') {
      const dots = [
        preview.startMarker === 'dot'
          ? (preview.startMarkerPointPx ?? preview.startPointPx)
          : null,
        preview.endMarker === 'dot'
          ? (preview.endMarkerPointPx ?? preview.endPointPx)
          : null,
      ].filter((pt): pt is NonNullable<typeof pt> => pt !== null);
      return (
        <Group listening={false}>
          {lineNode}
          {dots.map((pt, idx) => (
            <Circle
              key={idx === 0 ? 'start-dot' : 'end-dot'}
              x={pt.x}
              y={pt.y}
              radius={preview.dotRadiusPx}
              stroke={preview.color}
              strokeWidth={2}
              fill="transparent"
              listening={false}
              perfectDrawEnabled={false}
            />
          ))}
        </Group>
      );
    }

    return lineNode;
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

export const InteractionPreviewLayer = memo(function InteractionPreviewLayer({
  pitchRect,
  selectionBox,
  cleanRender,
}: InteractionPreviewLayerProps): ReactNode {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const connectingPlayerId = useSessionStore((s) => s.connectingPlayerId);
  const teamVisibility = useSessionStore((s) => s.teamVisibility);
  const drawingPreview = useSessionStore((s) => s.drawingPreview);
  const color = useSessionStore((s) => s.color);
  const strokeWidth = useSessionStore((s) => s.strokeWidth);
  const activeSlide = useDocumentStore((s) =>
    selectDomainActiveSlide(s.project, activePhaseId, activeSlideId),
  );

  const players = activeSlide?.players ?? [];
  const pitchTransform = activeSlide?.pitchTransform;
  const groupTransform = resolvePitchGroupTransform(pitchRect, pitchTransform);

  if (cleanRender) return null;
  const visibleMarkers = players
    .filter((p) => p.area === 'pitch')
    .filter(
      (p) =>
        teamVisibility === 'both' ||
        p.team === teamVisibility ||
        p.team === 'neutral',
    );

  const pw = pitchRect.width;
  const ph = pitchRect.height;
  const baseDim = Math.min(pw, ph);
  const resolvedPreview = drawingPreview
    ? compileDrawingPreview(
        drawingPreview,
        { width: pw, height: ph },
        { color, strokeWidth },
      )
    : null;

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

        {resolvedPreview != null
          ? renderSceneGraphDrawingPreview(resolvedPreview)
          : null}
      </Group>
    </Layer>
  );
});
