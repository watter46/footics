'use client';

/**
 * squad-sub-panel.tsx
 * Dedicated Right Panel: Squad & Substitutes (Bench) Management
 */

import { ChevronDown, UserPlus, Users } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  getPositionBadgeClass,
  groupPlayersByPosition,
  POSITION_GROUP_LABELS,
  POSITION_GROUPS,
  type PositionGroup,
} from '@/lib/tactical/player-formatting';
import { BenchPlayerRow } from './bench-player-row';

export function SquadSubPanel() {
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const project = useTacticalUnifiedStore((s) => s.project);

  const movePlayerToPitch = useTacticalUnifiedStore((s) => s.movePlayerToPitch);
  const swapPlayers = useTacticalUnifiedStore((s) => s.swapPlayers);
  const addCustomPlayer = useTacticalUnifiedStore((s) => s.addCustomPlayer);
  const removePlayer = useTacticalUnifiedStore((s) => s.removePlayer);

  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');
  const [activeSwapPlayerId, setActiveSwapPlayerId] = useState<string | null>(
    null,
  );
  const [openBenchSections, setOpenBenchSections] = useState<
    Record<PositionGroup, boolean>
  >({
    GK: true,
    DF: true,
    MF: true,
    FW: true,
    OTHER: true,
  });
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubNo, setNewSubNo] = useState('');
  const [newSubPos, setNewSubPos] = useState('SUB');

  const teamPlayers = useMemo(() => {
    if (!activeSlide) return { pitch: [], bench: [] };
    const pitch = activeSlide.players.filter(
      (p) => p.team === activeTeam && p.area === 'pitch',
    );
    const bench = activeSlide.players.filter(
      (p) => p.team === activeTeam && p.area === 'bench',
    );
    return { pitch, bench };
  }, [activeSlide, activeTeam]);

  const benchGroups = useMemo(
    () => groupPlayersByPosition(teamPlayers.bench),
    [teamPlayers.bench],
  );

  const teamColor =
    activeTeam === 'home'
      ? project.homeColor.primary
      : project.awayColor.primary;

  const handleAddSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() && !newSubNo.trim()) return;
    addCustomPlayer(
      activeSlideId,
      activeTeam,
      newSubName.trim() || undefined,
      newSubNo.trim() || undefined,
      newSubPos.trim() || undefined,
      'bench',
    );
    setNewSubName('');
    setNewSubNo('');
    setIsAddingSub(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#141414] text-white text-xs select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0 bg-[#181818]">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-blue-400" />
          <span className="font-semibold text-white/90">Squad & Bench</span>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingSub((v) => !v)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
            isAddingSub
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
          }`}
        >
          <UserPlus size={11} />
          <span>Add Player</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
        {/* 1. Team Switcher */}
        <div className="p-2.5 space-y-2">
          <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTeam('home')}
              className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
                activeTeam === 'home'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full border border-white/30 shrink-0"
                style={{ backgroundColor: project.homeColor.primary }}
              />
              <span>HOME</span>
              <span className="text-[10px] opacity-70">
                ({teamPlayers.bench.length} Sub)
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTeam('away')}
              className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
                activeTeam === 'away'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full border border-white/30 shrink-0"
                style={{ backgroundColor: project.awayColor.primary }}
              />
              <span>AWAY</span>
              <span className="text-[10px] opacity-70">
                ({teamPlayers.bench.length} Sub)
              </span>
            </button>
          </div>
        </div>

        {/* 2. Substitutes / Bench Area */}
        <div className="p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
              Substitutes ({teamPlayers.bench.length})
            </span>
          </div>

          {/* New Sub Player Form */}
          {isAddingSub && (
            <form
              onSubmit={handleAddSub}
              className="p-2.5 rounded-lg bg-black/40 border border-white/10 space-y-2"
            >
              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="text"
                  placeholder="No."
                  value={newSubNo}
                  onChange={(e) => setNewSubNo(e.target.value)}
                  className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                />
                <input
                  type="text"
                  placeholder="Pos"
                  value={newSubPos}
                  onChange={(e) => setNewSubPos(e.target.value)}
                  className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                />
                <button
                  type="submit"
                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer shadow-sm transition-colors"
                >
                  Add
                </button>
              </div>
              <input
                type="text"
                placeholder="Player Name"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
              />
            </form>
          )}

          {/* Bench Players (Position-Grouped Accordion) */}
          {teamPlayers.bench.length === 0 ? (
            <div className="p-4 rounded-lg border border-dashed border-white/10 text-center text-white/30 text-[11px]">
              No substitutes on bench.
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-0.5">
              {POSITION_GROUPS.filter(
                (grp) => grp !== 'OTHER' || benchGroups.OTHER.length > 0,
              ).map((grp) => {
                const groupPlayers = benchGroups[grp];
                const isOpen = openBenchSections[grp];
                return (
                  <div
                    key={`bench-grp-${grp}`}
                    className="rounded-lg bg-black/20 border border-white/5 overflow-hidden"
                  >
                    {/* Group Accordion Header */}
                    <button
                      type="button"
                      onClick={() =>
                        setOpenBenchSections((prev) => ({
                          ...prev,
                          [grp]: !prev[grp],
                        }))
                      }
                      className="w-full flex items-center justify-between px-2.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.06] text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded border font-mono font-semibold ${getPositionBadgeClass(grp)}`}
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

                    {/* Group Items */}
                    {isOpen && (
                      <div className="p-1.5 space-y-1">
                        {groupPlayers.length === 0 ? (
                          <div className="py-1 text-center text-[10px] text-white/20 italic">
                            No {POSITION_GROUP_LABELS[grp].toLowerCase()}
                          </div>
                        ) : (
                          groupPlayers.map((player) => (
                            <BenchPlayerRow
                              key={player.id}
                              player={player}
                              activeSlideId={activeSlideId}
                              pitchPlayers={teamPlayers.pitch}
                              teamColor={teamColor}
                              isSwapActive={activeSwapPlayerId === player.id}
                              onDeploy={(id) =>
                                movePlayerToPitch(activeSlideId, id)
                              }
                              onToggleSwap={(id) =>
                                setActiveSwapPlayerId((cur) =>
                                  cur === id ? null : id,
                                )
                              }
                              onSwap={(benchId, pitchId) =>
                                swapPlayers(activeSlideId, benchId, pitchId)
                              }
                              onRemove={(id) => removePlayer(activeSlideId, id)}
                              onCloseSwap={() => setActiveSwapPlayerId(null)}
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
      </div>
    </div>
  );
}
