'use client';

import type React from 'react';
import {
  Arrow,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
} from 'react-konva';
import type { TacticalScene } from '@/lib/types/syntax-integration';
import { ARROW_STYLES, ZONE_STYLES } from './syntax-pitch-constants';
import { SyntaxPitchOverlay } from './syntax-pitch-overlay';
import { SyntaxPitchPlayerMarker } from './syntax-pitch-player-marker';
import { useSyntaxPitchDimensions } from './use-syntax-pitch-dimensions';

export interface SyntaxPitchCanvasProps {
  mode: 'readOnly' | 'interactive';
  scene: TacticalScene | null;
  width?: number;
  height?: number;
  title?: string;
  badgeLabel?: string;
  badgeVariant?: 'ai' | 'human';
  className?: string;
  onPlayerPositionChange?: (playerId: string, x: number, y: number) => void;
  onPlayerAnnotationChange?: (playerId: string, annotation: string) => void;
}

export function SyntaxPitchCanvas({
  mode,
  scene,
  width: propWidth,
  height: propHeight,
  title,
  badgeLabel,
  badgeVariant = 'human',
  className = '',
  onPlayerPositionChange,
}: SyntaxPitchCanvasProps): React.JSX.Element {
  const { containerRef, pitchImage, stageWidth, stageHeight } =
    useSyntaxPitchDimensions({
      propWidth,
      propHeight,
    });

  const markerRadius = Math.max(12, Math.min(stageWidth, stageHeight) * 0.032);
  const isInteractive = mode === 'interactive';

  const handleDragUpdate = (playerId: string, normX: number, normY: number) => {
    if (!isInteractive) return;
    const clampedX = Math.max(0, Math.min(100, Math.round(normX * 10) / 10));
    const clampedY = Math.max(0, Math.min(100, Math.round(normY * 10) / 10));

    if (onPlayerPositionChange) {
      onPlayerPositionChange(playerId, clampedX, clampedY);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center select-none shadow-2xl rounded-xl overflow-hidden border border-slate-800 bg-slate-950 ${className}`}
      style={{
        width: propWidth || '100%',
        height: propHeight || '100%',
      }}
    >
      <SyntaxPitchOverlay
        badgeLabel={badgeLabel}
        badgeVariant={badgeVariant}
        title={title}
        isInteractive={isInteractive}
        sceneDescription={
          scene?.description || (scene ? 'Tactical Scene' : 'No scene loaded')
        }
        playerCount={scene?.players.length ?? 0}
      />

      {/* Konva Stage */}
      <Stage
        width={stageWidth}
        height={stageHeight}
        className="touch-none flex items-center justify-center"
      >
        {/* 1. 静的背景レイヤー (リスニング無効で負荷ゼロ) */}
        <Layer
          listening={false}
          clip={{
            x: 0,
            y: 0,
            width: stageWidth,
            height: stageHeight,
          }}
        >
          <Rect
            x={0}
            y={0}
            width={stageWidth}
            height={stageHeight}
            fill="#020617"
            perfectDrawEnabled={false}
          />
          {pitchImage && (
            <KonvaImage
              image={pitchImage}
              width={stageWidth}
              height={stageHeight}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
        </Layer>

        {/* 2. 動的要素レイヤー (ゾーン、矢印、選手マーカー) */}
        <Layer
          clip={{
            x: 0,
            y: 0,
            width: stageWidth,
            height: stageHeight,
          }}
        >
          {/* Zones (戦術ゾーン) */}
          {scene?.zones?.map((zone) => {
            const style = ZONE_STYLES[zone.type] || ZONE_STYLES.highlight;
            const points = zone.points.flatMap((p) => [
              (p.x / 100) * stageWidth,
              (p.y / 100) * stageHeight,
            ]);

            return (
              <Line
                key={zone.id}
                points={points}
                closed={true}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={1.5}
                opacity={0.7}
                listening={false}
                perfectDrawEnabled={false}
              />
            );
          })}

          {/* Arrows (パス・移動・ドリブル・守備アクション矢印) */}
          {scene?.arrows?.map((arrow) => {
            const style = ARROW_STYLES[arrow.type] || ARROW_STYLES.pass;
            const startX = (arrow.startX / 100) * stageWidth;
            const startY = (arrow.startY / 100) * stageHeight;
            const endX = (arrow.endX / 100) * stageWidth;
            const endY = (arrow.endY / 100) * stageHeight;

            return (
              <Arrow
                key={arrow.id}
                points={[startX, startY, endX, endY]}
                stroke={style.color}
                fill={style.color}
                strokeWidth={style.strokeWidth}
                dash={style.dash}
                opacity={0.9}
                pointerLength={10}
                pointerWidth={10}
                tension={0}
                listening={false}
                perfectDrawEnabled={false}
              />
            );
          })}

          {/* Players (選手マーカー) */}
          {scene?.players.map((player) => (
            <SyntaxPitchPlayerMarker
              key={player.id}
              player={player}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              markerRadius={markerRadius}
              isInteractive={isInteractive}
              onDragUpdate={handleDragUpdate}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
