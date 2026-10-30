'use client';

import type { ReactNode } from 'react';
import { Group, Rect as KonvaRect, Layer } from 'react-konva';
import type { SelectionBox } from '../hooks/use-canvas-selection-box';
import { useCanvasStore } from '../hooks/use-canvas-store';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import type { CameraState } from '../utils/matrix-coordinates';
import { renderDrawingPreviewNode } from './DrawingPreviewLayer';
import { PlayerConnectingGuide } from './PlayerConnectingGuide';

export interface InteractionPreviewLayerProps {
  stageSize: { width: number; height: number };
  pitchRect: PitchRectBounds;
  camera?: Partial<CameraState>;
  selectionBox?: SelectionBox | null;
  activePolygonId?: string | null;
  mousePreviewPos?: { x: number; y: number } | null;
  cleanRender?: boolean;
}

export function InteractionPreviewLayer({
  pitchRect,
  selectionBox,
  cleanRender,
}: InteractionPreviewLayerProps): ReactNode {
  const drawingPreview = useCanvasStore((s) => s.drawingPreview);
  const color = useCanvasStore((s) => s.color);
  const strokeWidth = useCanvasStore((s) => s.strokeWidth);
  const connectingPlayerId = useCanvasStore((s) => s.connectingPlayerId);
  const markers = useCanvasStore((s) => s.annotations.markers);
  const teamVisibility = useCanvasStore((s) => s.teamVisibility ?? 'both');

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
      <Group x={pitchRect.x} y={pitchRect.y} listening={false}>
        {connectingPlayerId && (
          <PlayerConnectingGuide
            connectingPlayerId={connectingPlayerId}
            markers={visibleMarkers}
            width={pw}
            height={ph}
            baseDim={baseDim}
          />
        )}

        {renderDrawingPreviewNode(drawingPreview, pw, ph, color, strokeWidth)}
      </Group>
    </Layer>
  );
}
