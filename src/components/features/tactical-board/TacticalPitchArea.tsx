'use client';

import type React from 'react';
import { getShirtNo, toViewPos } from '@/lib/data/tactical-utils';
import { useTacticalStore } from '@/stores/tactical-store';
import type { Match } from '@/types';
import {
  TacticalDrawingCanvas,
  type TacticalDrawTool,
} from './components/TacticalDrawingCanvas';
import { Pitch } from './Pitch';
import { PlayerMarker } from './PlayerMarker';

interface TacticalPitchAreaProps {
  matchId: string;
  metadata: Match;
  activeDrawTool: TacticalDrawTool;
  onMarkerTouch: () => void;
  onSelectDrawTool?: (tool: TacticalDrawTool) => void;
  onClearRef?: (clearFn: () => void) => void;
  pitchRef?: React.RefObject<HTMLDivElement | null>;
}

export const TacticalPitchArea: React.FC<TacticalPitchAreaProps> = ({
  matchId,
  metadata,
  activeDrawTool,
  onMarkerTouch,
  onSelectDrawTool,
  onClearRef,
  pitchRef,
}) => {
  const { savedSettings, isFlipped, ballPos, homeColor, awayColor } =
    useTacticalStore();

  const pitchPlayers = Object.values(savedSettings).filter(
    (p) => p.area === 'pitch',
  );

  return (
    <div className="flex-[3] flex items-center justify-center relative min-h-0 min-w-0">
      <div
        ref={pitchRef}
        className="relative max-w-full max-h-full aspect-[105/68] w-full h-auto"
      >
        <Pitch>
          {/* Konva 描画オーバーレイ */}
          <TacticalDrawingCanvas
            matchId={matchId}
            activeTool={activeDrawTool}
            onClearRef={onClearRef}
            onSelectToolRequested={(tool) => {
              onMarkerTouch();
              if (onSelectDrawTool) {
                onSelectDrawTool(tool);
              }
            }}
          />

          {/* マーカー層: 常に pointer-events-none。マーカー自身のみ pointer-events-auto */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {pitchPlayers.map((p) => {
              const playerMeta = metadata?.teams[
                p.team as keyof typeof metadata.teams
              ]?.players?.find((pm) => pm.playerId === p.playerId);
              const viewPos = toViewPos({ x: p.x, y: p.y }, isFlipped);
              return (
                <PlayerMarker
                  key={`${p.playerId}`}
                  id={`${matchId}-${p.playerId}`}
                  playerName={playerMeta?.name || `Player ${p.playerId}`}
                  shirtNo={getShirtNo(p) || getShirtNo(playerMeta)}
                  initialX={viewPos.x}
                  initialY={viewPos.y}
                  color={p.team === 'home' ? homeColor : awayColor}
                  onMarkerTouch={onMarkerTouch}
                />
              );
            })}
            {(() => {
              const viewBall = toViewPos(ballPos, isFlipped);
              return (
                <PlayerMarker
                  key="ball"
                  id="ball"
                  playerName="BALL"
                  initialX={viewBall.x}
                  initialY={viewBall.y}
                  color="#f97316"
                  isBall
                  onMarkerTouch={onMarkerTouch}
                />
              );
            })()}
          </div>
        </Pitch>

        {/*
         * ピッチ右横の浮遊パレット用 Portal マウント先
         * ピッチ右上端から右へ12pxの位置に上揃えで浮遊配置
         */}
        <div
          id="tactical-floating-palette"
          className="absolute top-0 left-[calc(100%+12px)] z-50 pointer-events-auto"
        />
      </div>
    </div>
  );
};
