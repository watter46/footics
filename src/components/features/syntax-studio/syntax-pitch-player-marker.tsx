'use client';

import type Konva from 'konva';
import { Circle, Group, Text } from 'react-konva';
import type { TacticalScene } from '@/lib/types/syntax-integration';
import { TEAM_COLORS } from './syntax-pitch-constants';

export type TacticalPlayer = TacticalScene['players'][number];

export interface SyntaxPitchPlayerMarkerProps {
  player: TacticalPlayer;
  stageWidth: number;
  stageHeight: number;
  markerRadius: number;
  isInteractive: boolean;
  onDragUpdate?: (playerId: string, normX: number, normY: number) => void;
}

export function SyntaxPitchPlayerMarker({
  player,
  stageWidth,
  stageHeight,
  markerRadius,
  isInteractive,
  onDragUpdate,
}: SyntaxPitchPlayerMarkerProps) {
  const pxX = (player.x / 100) * stageWidth;
  const pxY = (player.y / 100) * stageHeight;
  const playerColor = TEAM_COLORS[player.team] || TEAM_COLORS.home;

  const handleDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!isInteractive || !onDragUpdate) return;
    const rawX = (e.target.x() / stageWidth) * 100;
    const rawY = (e.target.y() / stageHeight) * 100;
    onDragUpdate(player.id, rawX, rawY);
  };

  return (
    <Group
      id={`player-${player.id}`}
      x={pxX}
      y={pxY}
      draggable={isInteractive}
      dragBoundFunc={(pos) => ({
        x: Math.max(0, Math.min(stageWidth, pos.x)),
        y: Math.max(0, Math.min(stageHeight, pos.y)),
      })}
      onDragMove={handleDrag}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        handleDrag(e);
        const stage = e.target.getStage();
        const container = stage?.container();
        if (container) {
          container.style.cursor = 'grab';
        }
      }}
      onMouseEnter={(e: Konva.KonvaEventObject<MouseEvent>) => {
        if (isInteractive) {
          const stage = e.target.getStage();
          const container = stage?.container();
          if (container) {
            container.style.cursor = 'grab';
          }
        }
      }}
      onMouseLeave={(e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        const container = stage?.container();
        if (container) {
          container.style.cursor = 'default';
        }
      }}
      onDragStart={(e: Konva.KonvaEventObject<DragEvent>) => {
        if (isInteractive) {
          const stage = e.target.getStage();
          const container = stage?.container();
          if (container) {
            container.style.cursor = 'grabbing';
          }
        }
      }}
    >
      {/* マーカー本体 (サークル) */}
      <Circle
        radius={markerRadius}
        fill={playerColor}
        stroke="#ffffff"
        strokeWidth={2}
        shadowColor="#000000"
        shadowBlur={4}
        shadowOffset={{ x: 0, y: 2 }}
        shadowOpacity={0.4}
        perfectDrawEnabled={false}
      />

      {/* 背番号 (中央表示) */}
      {player.jerseyNumber !== undefined && (
        <Text
          text={player.jerseyNumber.toString()}
          x={-markerRadius}
          y={-markerRadius}
          width={markerRadius * 2}
          height={markerRadius * 2}
          align="center"
          verticalAlign="middle"
          fill="#ffffff"
          fontSize={Math.max(10, Math.round(markerRadius * 1.05))}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontStyle="bold"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* アノテーション (下部表示) */}
      {player.annotation && (
        <Text
          text={player.annotation}
          x={-markerRadius * 3}
          y={markerRadius + 3}
          width={markerRadius * 6}
          align="center"
          fill="#ffffff"
          stroke="#020617"
          strokeWidth={2.5}
          fillAfterStrokeEnabled={true}
          fontSize={Math.max(9, Math.round(markerRadius * 0.7))}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontStyle="bold"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  );
}
