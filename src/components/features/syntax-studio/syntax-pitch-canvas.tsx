'use client';

import type Konva from 'konva';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Arrow,
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
} from 'react-konva';
import type { TacticalScene } from '@/lib/types/syntax-integration';

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

const PITCH_ASPECT_RATIO = 105 / 68;

const horizontalPitchSvg = `<svg viewBox="-1 -1 107 70" xmlns="http://www.w3.org/2000/svg">
  <rect x="-1" y="-1" width="107" height="70" fill="#020617" />
  <rect x="0" y="0" width="105" height="68" fill="#020617" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <line x1="52.5" y1="0" x2="52.5" y2="68" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="52.5" cy="34" r="0.4" fill="#e2b48d" opacity="0.8"/>
  <rect x="0" y="13.85" width="16.5" height="40.3" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="0" y="24.85" width="5.5" height="18.3" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="11" cy="34" r="0.3" fill="#e2b48d" opacity="0.8"/>
  <path d="M 16.5 26.69 A 9.15 9.15 0 0 1 16.5 41.31" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="88.5" y="13.85" width="16.5" height="40.3" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="99.5" y="24.85" width="5.5" height="18.3" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="94" cy="34" r="0.3" fill="#e2b48d" opacity="0.8"/>
  <path d="M 88.5 26.69 A 9.15 9.15 0 0 0 88.5 41.31" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
</svg>`;

const ZONE_STYLES: Record<
  'highlight' | 'space' | 'danger',
  { fill: string; stroke: string }
> = {
  highlight: {
    fill: 'rgba(56, 189, 248, 0.25)',
    stroke: '#38bdf8',
  },
  space: {
    fill: 'rgba(34, 197, 94, 0.25)',
    stroke: '#22c55e',
  },
  danger: {
    fill: 'rgba(239, 68, 68, 0.25)',
    stroke: '#ef4444',
  },
};

const ARROW_STYLES: Record<
  'pass' | 'move' | 'dribble' | 'defend',
  { color: string; dash?: number[]; strokeWidth: number }
> = {
  pass: {
    color: '#38bdf8',
    dash: undefined,
    strokeWidth: 2.5,
  },
  move: {
    color: '#fbbf24',
    dash: [6, 4],
    strokeWidth: 2.5,
  },
  dribble: {
    color: '#a855f7',
    dash: [3, 3],
    strokeWidth: 2.5,
  },
  defend: {
    color: '#ef4444',
    dash: [5, 3],
    strokeWidth: 2.5,
  },
};

const TEAM_COLORS: Record<'home' | 'away', string> = {
  home: '#2563eb',
  away: '#dc2626',
};

export const SyntaxPitchCanvas: React.FC<SyntaxPitchCanvasProps> = ({
  mode,
  scene,
  width: propWidth,
  height: propHeight,
  title,
  badgeLabel,
  badgeVariant = 'human',
  className = '',
  onPlayerPositionChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [pitchImage, setPitchImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ピッチSVGのロード
  useEffect(() => {
    const img = new window.Image();
    const svg = new Blob([horizontalPitchSvg], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(svg);
    img.src = url;
    img.onload = () => {
      setPitchImage(img);
    };
    return () => {
      URL.revokeObjectURL(url);
    };
  }, []);

  // コンテナサイズ監視 (Responsive auto-fit)
  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // ステージの実サイズ計算 (アスペクト比 105:68 の維持)
  const { stageWidth, stageHeight } = useMemo(() => {
    if (propWidth && propHeight) {
      return { stageWidth: propWidth, stageHeight: propHeight };
    }

    const availableWidth = propWidth || containerDimensions.width || 630;
    const availableHeight =
      propHeight ||
      containerDimensions.height ||
      availableWidth / PITCH_ASPECT_RATIO;

    let targetWidth = availableWidth;
    let targetHeight = availableWidth / PITCH_ASPECT_RATIO;

    if (targetHeight > availableHeight && availableHeight > 0) {
      targetHeight = availableHeight;
      targetWidth = availableHeight * PITCH_ASPECT_RATIO;
    }

    return {
      stageWidth: Math.max(100, Math.round(targetWidth)),
      stageHeight: Math.max(68, Math.round(targetHeight)),
    };
  }, [propWidth, propHeight, containerDimensions]);

  const markerRadius = Math.max(12, Math.min(stageWidth, stageHeight) * 0.032);
  const isInteractive = mode === 'interactive';

  const handleDragUpdate = (
    _sceneId: string,
    playerId: string,
    normX: number,
    normY: number,
  ) => {
    if (!isInteractive) return;
    const clampedX = Math.max(0, Math.min(100, Math.round(normX * 10) / 10));
    const clampedY = Math.max(0, Math.min(100, Math.round(normY * 10) / 10));

    if (onPlayerPositionChange) {
      onPlayerPositionChange(playerId, clampedX, clampedY);
    }
  };

  if (!isMounted) {
    return (
      <div
        ref={containerRef}
        className={`relative flex items-center justify-center bg-slate-950 rounded-xl overflow-hidden border border-slate-800 ${className}`}
        style={{
          aspectRatio: `${PITCH_ASPECT_RATIO}`,
          width: propWidth || '100%',
          height: propHeight || '100%',
        }}
      >
        <div className="text-xs text-slate-500 font-mono animate-pulse">
          Loading Canvas...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center select-none shadow-2xl rounded-xl overflow-hidden border border-slate-800 bg-slate-950 ${className}`}
      style={{
        width: propWidth || '100%',
        height: propHeight || '100%',
      }}
    >
      {/* ヘッダーオーバーレイ (バッジ・タイトル) */}
      {(badgeLabel || title || isInteractive) && (
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            {badgeLabel && (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border shadow-sm ${
                  badgeVariant === 'ai'
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 shadow-cyan-950/50'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-emerald-950/50'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    badgeVariant === 'ai'
                      ? 'bg-cyan-400 animate-pulse'
                      : 'bg-emerald-400'
                  }`}
                />
                {badgeLabel}
              </span>
            )}
            {title && (
              <span className="text-xs font-medium text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700/50 truncate max-w-[200px] sm:max-w-xs">
                {title}
              </span>
            )}
          </div>

          {isInteractive && (
            <span className="text-[10px] font-medium text-emerald-400/90 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              Drag to Adjust
            </span>
          )}
        </div>
      )}

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
          {scene?.players.map((player) => {
            const pxX = (player.x / 100) * stageWidth;
            const pxY = (player.y / 100) * stageHeight;
            const playerColor = TEAM_COLORS[player.team] || TEAM_COLORS.home;

            return (
              <Group
                key={player.id}
                id={`player-${player.id}`}
                x={pxX}
                y={pxY}
                draggable={isInteractive}
                dragBoundFunc={(pos) => ({
                  x: Math.max(0, Math.min(stageWidth, pos.x)),
                  y: Math.max(0, Math.min(stageHeight, pos.y)),
                })}
                onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
                  if (!isInteractive || !scene) return;
                  const rawX = (e.target.x() / stageWidth) * 100;
                  const rawY = (e.target.y() / stageHeight) * 100;
                  handleDragUpdate(scene.id, player.id, rawX, rawY);
                }}
                onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                  if (!isInteractive || !scene) return;
                  const rawX = (e.target.x() / stageWidth) * 100;
                  const rawY = (e.target.y() / stageHeight) * 100;
                  handleDragUpdate(scene.id, player.id, rawX, rawY);

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
          })}
        </Layer>
      </Stage>

      {/* フッター情報 */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-2 text-[10px] text-slate-400 bg-gradient-to-t from-slate-950/90 to-transparent flex justify-between items-end pointer-events-none">
        <span className="truncate max-w-[80%] font-mono text-[10px] text-slate-400">
          {scene?.description || (scene ? 'Tactical Scene' : 'No scene loaded')}
        </span>
        <span className="font-mono text-[10px] text-slate-500 shrink-0">
          {scene?.players.length ?? 0} Players
        </span>
      </div>
    </div>
  );
};
