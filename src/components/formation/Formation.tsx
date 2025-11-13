'use client';

import {
  FORMATION_POSITIONS,
  type FormationType,
} from '@/lib/formation-template';
import type { Player } from '@/lib/db';
import { cn } from '@/lib/utils/cn';
import type { FormationPlayers } from '@/types/formation';

const extractLastName = (name?: string): string | undefined => {
  if (!name) {
    return undefined;
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return undefined;
  }

  const segments = trimmed.split(/[.\s]+/).filter(Boolean);
  if (segments.length === 0) {
    return undefined;
  }

  return segments[segments.length - 1];
};

interface FormationProps {
  formationName: FormationType;
  players: FormationPlayers;
  selectedPositionId?: number | null;
  onPositionClick: (positionId: number, player?: Player) => void;
}

export function Formation({
  formationName,
  players,
  selectedPositionId,
  onPositionClick,
}: FormationProps) {
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
        const jerseyNumber = assignedPlayer?.number;
        const jerseyLabel =
          typeof jerseyNumber === 'number' && !Number.isNaN(jerseyNumber)
            ? `#${jerseyNumber}`
            : '-';
        const lastName = extractLastName(assignedPlayer?.name);
        const isSelected = selectedPositionId === slot.id;

        return (
          <div
            key={slot.id}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center"
            style={{
              top: `${slot.top}%`,
              left: `${slot.left}%`,
            }}
          >
            <button
              type="button"
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-full border bg-emerald-700/80 text-center font-semibold text-emerald-50 shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-600/80 focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-900 focus-visible:outline-none',
                isSelected
                  ? 'border-sky-400/90 bg-sky-700/80 text-sky-50'
                  : 'border-emerald-500/60'
              )}
              onClick={() => onPositionClick(slot.id, assignedPlayer)}
              aria-pressed={isSelected}
            >
              <div className="absolute -top-2 -translate-x-2/3 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-100 uppercase">
                {slot.position}
              </div>
              <span className="text-sm leading-none font-bold text-emerald-50">
                {jerseyLabel}
              </span>
            </button>
            <div
              className={cn(
                'w-20 text-center text-xs leading-tight font-semibold text-slate-100',
                isSelected && 'text-sky-200'
              )}
            >
              {lastName}
            </div>
          </div>
        );
      })}
    </div>
  );
}
