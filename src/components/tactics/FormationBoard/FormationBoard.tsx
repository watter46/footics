'use client';

import {
  FORMATION_POSITIONS,
  type FormationType,
} from '@/lib/formation-template';
import type { Player } from '@/lib/db';
import type { FormationPlayers } from '@/types/formation';

import { PlayerMarker } from './parts/PlayerMarker';

interface FormationBoardProps {
  formationName: FormationType;
  players: FormationPlayers;
  selectedPositionId?: number | null;
  onPositionClick: (positionId: number, player?: Player) => void;
}

export function FormationBoard({
  formationName,
  players,
  selectedPositionId,
  onPositionClick,
}: FormationBoardProps) {
  const positionSlots = FORMATION_POSITIONS[formationName];

  if (!positionSlots) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">
        指定されたフォーメーション「{formationName}」は定義されていません。
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      {positionSlots.map(slot => {
        const assignedPlayer = players[slot.id];
        const isSelected = selectedPositionId === slot.id;

        return (
          <PlayerMarker
            key={slot.id}
            player={assignedPlayer}
            positionLabel={slot.position}
            isSelected={isSelected}
            onClick={() => onPositionClick(slot.id, assignedPlayer)}
            className="absolute -translate-x-1/2 -translate-y-1/2 transform"
            style={{
              top: `${slot.top}%`,
              left: `${slot.left}%`,
            }}
          />
        );
      })}
    </div>
  );
}
