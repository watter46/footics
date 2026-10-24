'use client';

/**
 * squad-sub-panel.tsx
 * Dedicated Right Panel: Squad & Substitutes (Bench) Management
 */

import { useDroppable } from '@dnd-kit/core';
import { Sparkles, UserPlus, Users } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { FormationBenchItem } from './formation-bench-item';
import { FormationCustomManager } from './formation-custom-manager';

export function SquadSubPanel() {
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const project = useTacticalUnifiedStore((s) => s.project);

  const addCustomPlayer = useTacticalUnifiedStore((s) => s.addCustomPlayer);
  const removePlayer = useTacticalUnifiedStore((s) => s.removePlayer);

  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubNo, setNewSubNo] = useState('');
  const [newSubPos, setNewSubPos] = useState('SUB');

  const { setNodeRef: setBenchDroppableRef, isOver } = useDroppable({
    id: 'tactical-bench-droppable',
    data: { type: 'bench', team: activeTeam },
  });

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

  const teamColor =
    activeTeam === 'home'
      ? project.homeColor.primary
      : project.awayColor.primary;

  const POSITION_ORDER: Record<string, number> = {
    GK: 1,
    DF: 2,
    CB: 2,
    LB: 2,
    RB: 2,
    LWB: 2,
    RWB: 2,
    MF: 3,
    DM: 3,
    CM: 3,
    AM: 3,
    LM: 3,
    RM: 3,
    FW: 4,
    CF: 4,
    ST: 4,
    LW: 4,
    RW: 4,
    SS: 4,
    OTHER: 5,
  };

  const handleOrganizeBench = () => {
    if (!activeSlide) return;
    const sortedBench = [...teamPlayers.bench].sort((a, b) => {
      const orderA = POSITION_ORDER[a.position ?? 'OTHER'] ?? 5;
      const orderB = POSITION_ORDER[b.position ?? 'OTHER'] ?? 5;
      if (orderA !== orderB) return orderA - orderB;
      const numA = Number.parseInt(a.shirtNo || '999', 10);
      const numB = Number.parseInt(b.shirtNo || '999', 10);
      return numA - numB;
    });

    const otherPlayers = activeSlide.players.filter(
      (p) => !(p.team === activeTeam && p.area === 'bench'),
    );
    useTacticalUnifiedStore.setState((s) => ({
      ...s,
      project: {
        ...s.project,
        slides: s.project.slides.map((sl) =>
          sl.id === activeSlideId
            ? { ...sl, players: [...otherPlayers, ...sortedBench] }
            : sl,
        ),
      },
      isDirty: true,
    }));
  };

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

        {/* 2. Substitutes / Bench Area (自由配置ベンチキャンバス 3列グリッド) */}
        <div className="p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
              Substitutes ({teamPlayers.bench.length})
            </span>
            <button
              type="button"
              onClick={handleOrganizeBench}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[10px] font-medium transition-colors cursor-pointer border border-white/10 shadow-xs"
              title="ポジション順（GK/DF/MF/FW）に3列再整列"
            >
              <Sparkles size={11} className="text-amber-400" />
              <span>整理</span>
            </button>
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

          {/* Droppable Bench Canvas Area */}
          <div
            ref={setBenchDroppableRef}
            className={`min-h-[160px] max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar p-2 rounded-xl border-2 transition-all ${
              isOver
                ? 'border-blue-500/80 bg-blue-500/10 shadow-lg'
                : 'border-white/10 bg-black/30'
            }`}
          >
            {teamPlayers.bench.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-lg text-white/30 text-xs">
                <span>ベンチ選手がいません</span>
                <span className="text-[10px] opacity-60 mt-1">
                  ピッチからドロップして退避
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {teamPlayers.bench.map((player) => (
                  <FormationBenchItem
                    key={player.id}
                    player={player}
                    teamColor={teamColor}
                    activeSlideId={activeSlideId}
                    onRemovePlayer={(sId, pId) => removePlayer(sId, pId)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Club & Season Presets (Only displayed for normal boards without matchId) */}
        {!project.matchId && (
          <FormationCustomManager
            activeTeam={activeTeam}
            activeSlideId={activeSlideId}
            formationMode="full"
          />
        )}
      </div>
    </div>
  );
}
