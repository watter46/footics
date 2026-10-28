'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { Layer, Stage } from 'react-konva';
import { PlayerMarkerItem } from '@/features/tactical-unified/core/components/PlayerMarkerItem';
import type { Player } from '@/lib/types/tactical-unified';

export const BASE_BENCH_HEIGHT = 280;

export interface SquadBenchCanvasProps {
  benchPlayers: Player[];
  selectedIds: string[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasWidth: number;
  stageHeight: number;
  onDragStart: (e: KonvaEventObject<DragEvent>, markerId: string) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>, marker: Player) => void;
  onClick: (markerId: string, isShift: boolean) => void;
}

export function SquadBenchCanvas({
  benchPlayers,
  selectedIds,
  containerRef,
  canvasWidth,
  stageHeight,
  onDragStart,
  onDragEnd,
  onClick,
}: SquadBenchCanvasProps) {
  return (
    <div className="min-h-[160px] max-h-[360px] overflow-y-auto custom-scrollbar rounded-xl border border-white/[0.08] bg-black/40">
      {benchPlayers.length === 0 ? (
        <div className="h-32 flex flex-col items-center justify-center border border-dashed border-white/[0.08] rounded-lg text-white/30 text-xs m-2">
          <span>ベンチ選手がいません</span>
          <span className="text-[10px] opacity-60 mt-1">
            ピッチからドラッグして退避
          </span>
        </div>
      ) : (
        <div
          id="tactical-bench-canvas"
          ref={containerRef}
          className="w-full relative"
          style={{ minHeight: BASE_BENCH_HEIGHT, height: stageHeight }}
        >
          <Stage width={canvasWidth} height={stageHeight} listening={true}>
            <Layer>
              {benchPlayers.map((player) => (
                <PlayerMarkerItem
                  key={player.id}
                  marker={player}
                  width={canvasWidth}
                  height={BASE_BENCH_HEIGHT}
                  baseDim={canvasWidth}
                  markerMode="2d-only"
                  isSelected={selectedIds.includes(player.id)}
                  isInteractive={true}
                  connectingPlayerId={null}
                  onDragStart={onDragStart}
                  onDragMove={() => {}}
                  onDragEnd={onDragEnd}
                  onClick={onClick}
                  onUpdateVisionCone={() => {}}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      )}
    </div>
  );
}
