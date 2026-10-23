'use client';

import type { ReactNode } from 'react';
import {
  Group,
  Arrow as KonvaArrow,
  Circle as KonvaCircle,
  Ellipse as KonvaEllipse,
  Line as KonvaLine,
  Rect as KonvaRect,
  Layer,
} from 'react-konva';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { SelectionBox } from '../hooks/use-canvas-selection-box';
import { useCanvasStore } from '../hooks/use-canvas-store';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import type { CameraState } from '../utils/matrix-coordinates';
import { getWavyPoints } from './annotations/wavy-arrow-math';
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
  const teamVisibility = useTacticalUnifiedStore((s) => s.teamVisibility);

  if (cleanRender) return null;
  const visibleMarkers =
    teamVisibility === 'both'
      ? markers
      : markers.filter(
          (m) => m.team === teamVisibility || m.team === 'neutral',
        );

  const dp = drawingPreview;
  const pw = pitchRect.width;
  const ph = pitchRect.height;
  const sPxX = dp ? (dp.startX / 100) * pw : 0;
  const sPxY = dp ? (dp.startY / 100) * ph : 0;
  const cPxX = dp ? (dp.currentX / 100) * pw : 0;
  const cPxY = dp ? (dp.currentY / 100) * ph : 0;

  const getToolColor = (tool: string) => {
    if (color && color !== '#ffffff') return color;
    if (tool === 'route_line') return '#38bdf8';
    if (tool === 'arrow_wavy') return '#eab308';
    if (tool === 'zone' || tool === 'zone_circle') return '#ef4444';
    return '#ffffff';
  };
  const previewColor = dp ? getToolColor(dp.tool as string) : color;
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

        {dp?.isDrawing && (
          <Group listening={false}>
            {dp.tool === 'line' && (
              <KonvaLine
                points={[sPxX, sPxY, cPxX, cPxY]}
                stroke={previewColor}
                strokeWidth={strokeWidth}
                opacity={0.85}
                perfectDrawEnabled={false}
              />
            )}

            {dp.tool === 'route_line' && (
              <Group>
                <KonvaLine
                  points={[sPxX, sPxY, cPxX, cPxY]}
                  stroke={previewColor}
                  strokeWidth={strokeWidth}
                  opacity={0.85}
                  perfectDrawEnabled={false}
                />
                <KonvaCircle
                  x={sPxX}
                  y={sPxY}
                  radius={6}
                  stroke={previewColor}
                  strokeWidth={2}
                  fill="transparent"
                  perfectDrawEnabled={false}
                />
                <KonvaCircle
                  x={cPxX}
                  y={cPxY}
                  radius={6}
                  stroke={previewColor}
                  strokeWidth={2}
                  fill="transparent"
                  perfectDrawEnabled={false}
                />
              </Group>
            )}

            {(dp.tool === 'arrow_solid' || dp.tool === 'arrow-straight') && (
              <KonvaArrow
                points={[sPxX, sPxY, cPxX, cPxY]}
                stroke={previewColor}
                strokeWidth={strokeWidth}
                fill={previewColor}
                pointerLength={15}
                pointerWidth={15}
                opacity={0.85}
                perfectDrawEnabled={false}
              />
            )}

            {(dp.tool === 'arrow_dash' || dp.tool === 'arrow-curved') && (
              <KonvaArrow
                points={[sPxX, sPxY, cPxX, cPxY]}
                stroke={previewColor}
                strokeWidth={strokeWidth}
                fill={previewColor}
                dash={[6, 4]}
                pointerLength={15}
                pointerWidth={15}
                opacity={0.85}
                perfectDrawEnabled={false}
              />
            )}

            {dp.tool === 'arrow_wavy' && (
              <KonvaArrow
                points={getWavyPoints(sPxX, sPxY, cPxX, cPxY)}
                stroke={previewColor}
                strokeWidth={strokeWidth}
                fill={previewColor}
                pointerLength={15}
                pointerWidth={15}
                opacity={0.85}
                perfectDrawEnabled={false}
              />
            )}

            {dp.tool === 'zone_circle' && (
              <KonvaEllipse
                x={(sPxX + cPxX) / 2}
                y={(sPxY + cPxY) / 2}
                radiusX={Math.abs(cPxX - sPxX) / 2}
                radiusY={Math.abs(cPxY - sPxY) / 2}
                fill={previewColor}
                opacity={0.25}
                stroke={previewColor}
                strokeWidth={1.5}
                dash={[4, 4]}
                perfectDrawEnabled={false}
              />
            )}

            {dp.tool === 'zone' && (
              <KonvaRect
                x={Math.min(sPxX, cPxX)}
                y={Math.min(sPxY, cPxY)}
                width={Math.abs(cPxX - sPxX)}
                height={Math.abs(cPxY - sPxY)}
                fill={previewColor}
                opacity={0.25}
                stroke={previewColor}
                strokeWidth={1.5}
                dash={[4, 4]}
                cornerRadius={4}
                perfectDrawEnabled={false}
              />
            )}

            {dp.points && dp.points.length >= 4 && (
              <KonvaLine
                points={dp.points.map((p, i) =>
                  i % 2 === 0 ? (p / 100) * pw : (p / 100) * ph,
                )}
                stroke={previewColor}
                strokeWidth={strokeWidth}
                lineCap="round"
                lineJoin="round"
                perfectDrawEnabled={false}
              />
            )}
          </Group>
        )}
      </Group>
    </Layer>
  );
}
