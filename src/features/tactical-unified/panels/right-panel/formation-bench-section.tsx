'use client';

import { ChevronDown, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  getPositionBadgeClass,
  groupPlayersByPosition,
  POSITION_GROUP_LABELS,
  POSITION_GROUPS,
  type PositionGroup,
} from '@/lib/tactical/player-formatting';
import type { Player } from '@/lib/types/tactical-unified';
import { FormationBenchAddForm } from './formation-bench-add-form';
import { FormationBenchItem } from './formation-bench-item';

interface FormationBenchSectionProps {
  activeSlideId: string;
  activeTeam: 'home' | 'away';
  teamColor: string;
  benchPlayers: Player[];
  pitchPlayers: Player[];
  onMoveToPitch: (slideId: string, playerId: string) => void;
  onSwapPlayers: (slideId: string, p1: string, p2: string) => void;
  onAddPlayer: (
    slideId: string,
    team: 'home' | 'away',
    name?: string,
    shirtNo?: string,
    pos?: string,
    area?: 'pitch' | 'bench',
  ) => void;
  onRemovePlayer: (slideId: string, playerId: string) => void;
}

export function FormationBenchSection({
  activeSlideId,
  activeTeam,
  teamColor,
  benchPlayers,
  pitchPlayers,
  onMoveToPitch,
  onSwapPlayers,
  onAddPlayer,
  onRemovePlayer,
}: FormationBenchSectionProps) {
  const [activeSwapPlayerId, setActiveSwapPlayerId] = useState<string | null>(
    null,
  );
  const [openSections, setOpenSections] = useState<
    Record<PositionGroup, boolean>
  >({
    GK: true,
    DF: true,
    MF: true,
    FW: true,
    OTHER: true,
  });
  const [isAddingSub, setIsAddingSub] = useState(false);

  const benchGroups = useMemo(
    () => groupPlayersByPosition(benchPlayers),
    [benchPlayers],
  );

  return (
    <div className="p-3 space-y-2.5 bg-white/[0.01]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
          Substitutes ({benchPlayers.length})
        </span>
        <button
          type="button"
          onClick={() => setIsAddingSub((v) => !v)}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white/80 hover:text-white transition-colors cursor-pointer"
        >
          <UserPlus size={11} />
          <span>Add</span>
        </button>
      </div>

      {isAddingSub && (
        <FormationBenchAddForm
          activeSlideId={activeSlideId}
          activeTeam={activeTeam}
          onAddPlayer={onAddPlayer}
          onClose={() => setIsAddingSub(false)}
        />
      )}

      {benchPlayers.length === 0 ? (
        <div className="p-3 rounded border border-dashed border-white/10 text-center text-white/30 text-[11px]">
          No substitutes.
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-0.5">
          {POSITION_GROUPS.filter(
            (grp) => grp !== 'OTHER' || benchGroups.OTHER.length > 0,
          ).map((grp) => {
            const groupPlayers = benchGroups[grp];
            const isOpen = openSections[grp];
            return (
              <div
                key={`bench-grp-${grp}`}
                className="rounded bg-black/20 border border-white/5 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenSections((prev) => ({ ...prev, [grp]: !prev[grp] }))
                  }
                  className="w-full flex items-center justify-between px-2 py-1.5 bg-white/[0.03] hover:bg-white/[0.06] text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded border font-mono font-semibold ${getPositionBadgeClass(
                        grp,
                      )}`}
                    >
                      {grp}
                    </span>
                    <span className="text-[10px] font-medium text-white/70">
                      {POSITION_GROUP_LABELS[grp]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-white/40 bg-white/5 px-1.5 py-0.2 rounded-full font-mono">
                      {groupPlayers.length}
                    </span>
                    <ChevronDown
                      size={11}
                      className={`text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="p-1 space-y-1">
                    {groupPlayers.length === 0 ? (
                      <div className="py-1 text-center text-[10px] text-white/20 italic">
                        No {POSITION_GROUP_LABELS[grp].toLowerCase()}
                      </div>
                    ) : (
                      groupPlayers.map((player) => (
                        <FormationBenchItem
                          key={player.id}
                          player={player}
                          teamColor={teamColor}
                          activeSlideId={activeSlideId}
                          pitchPlayers={pitchPlayers}
                          activeSwapPlayerId={activeSwapPlayerId}
                          onToggleSwap={(id) =>
                            setActiveSwapPlayerId((cur) =>
                              cur === id ? null : id,
                            )
                          }
                          onCloseSwap={() => setActiveSwapPlayerId(null)}
                          onMoveToPitch={onMoveToPitch}
                          onSwapPlayers={onSwapPlayers}
                          onRemovePlayer={onRemovePlayer}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
