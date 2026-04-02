"use client";

import React from 'react';
import { Pitch } from './Pitch';
import { PlayerMarker } from './PlayerMarker';
import { useTacticalStore } from '@/hooks/use-tactical-store';
import { toViewPos } from '@/lib/data/tactical-utils';

interface TacticalPitchAreaProps {
  matchId: string;
  metadata: any;
}

export const TacticalPitchArea: React.FC<TacticalPitchAreaProps> = ({
  matchId,
  metadata,
}) => {
  const { savedSettings, isFlipped, ballPos, homeColor, awayColor } = useTacticalStore();
  
  const pitchPlayers = Object.values(savedSettings).filter(p => p.area === 'pitch');

  return (
    <div className="flex-[3] flex items-center justify-center relative min-h-0 min-w-0">
      <div className="relative max-w-full max-h-full aspect-[105/68] w-full h-auto">
        <Pitch>
          {pitchPlayers.map((p) => {
            const playerMeta = metadata?.teams[p.team]?.players?.find((pm: any) => pm.playerId === p.playerId);
            const viewPos = toViewPos({ x: p.x, y: p.y }, isFlipped);
            return (
              <PlayerMarker 
                key={`${p.playerId}`}
                id={`${matchId}-${p.playerId}`}
                playerName={playerMeta?.name || `Player ${p.playerId}`}
                initialX={viewPos.x}
                initialY={viewPos.y}
                color={p.team === "home" ? homeColor : awayColor}
              />
            );
          })}
          {(() => {
            const viewBall = toViewPos(ballPos, isFlipped);
            return (
              <PlayerMarker key="ball" id="ball" playerName="BALL" initialX={viewBall.x} initialY={viewBall.y} color="#f97316" isBall />
            );
          })()}
        </Pitch>
      </div>
    </div>
  );
};
