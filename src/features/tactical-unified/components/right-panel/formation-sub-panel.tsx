'use client';

/**
 * formation-sub-panel.tsx
 * Figma-like Right Panel: Formation & Squad (Sub-members) management
 */

import { Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import type { FormationMode, FormationType } from '@/lib/data/formations';
import { FormationBenchSection } from './formation-bench-section';
import { FormationCustomManager } from './formation-custom-manager';
import { FormationPresetSelector } from './formation-preset-selector';
import { FormationTeamToggle } from './formation-team-toggle';

export function FormationSubPanel() {
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const project = useTacticalUnifiedStore((s) => s.project);

  // Store actions
  const applyFormation = useTacticalUnifiedStore((s) => s.applyFormation);
  const movePlayerToPitch = useTacticalUnifiedStore((s) => s.movePlayerToPitch);
  const swapPlayers = useTacticalUnifiedStore((s) => s.swapPlayers);
  const addCustomPlayer = useTacticalUnifiedStore((s) => s.addCustomPlayer);
  const removePlayer = useTacticalUnifiedStore((s) => s.removePlayer);
  const setTeamColor = useTacticalUnifiedStore((s) => s.setTeamColor);
  const teamVisibility = useTacticalUnifiedStore((s) => s.teamVisibility);
  const setTeamVisibility = useTacticalUnifiedStore((s) => s.setTeamVisibility);

  // Local states
  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');
  const [formationMode] = useState<FormationMode>('half');
  const [selectedFormation, setSelectedFormation] =
    useState<FormationType>('4-3-3');

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

  const teamPlayersCount = useMemo(() => {
    if (!activeSlide) return { home: 0, away: 0 };
    const home = activeSlide.players.filter(
      (p) => p.team === 'home' && p.area === 'pitch',
    ).length;
    const away = activeSlide.players.filter(
      (p) => p.team === 'away' && p.area === 'pitch',
    ).length;
    return { home, away };
  }, [activeSlide]);

  const teamColor =
    activeTeam === 'home'
      ? project.homeColor.primary
      : project.awayColor.primary;

  const handleApplyFormation = (f: FormationType) => {
    setSelectedFormation(f);
    applyFormation(activeSlideId, f, formationMode, activeTeam);
  };

  return (
    <div className="flex flex-col h-full bg-[#141414] text-white text-xs select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 shrink-0 bg-[#181818]">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-blue-400" />
          <span className="font-semibold text-white/90">Formation & Squad</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
        {/* 1. Team Selection & Team Color & Visibility */}
        <FormationTeamToggle
          activeTeam={activeTeam}
          onTeamChange={setActiveTeam}
          homeColor={project.homeColor.primary}
          awayColor={project.awayColor.primary}
          onColorChange={setTeamColor}
          teamPlayersCount={teamPlayersCount}
          teamVisibility={teamVisibility}
          onVisibilityChange={setTeamVisibility}
        />

        {/* 2. Formation Presets */}
        <FormationPresetSelector
          selectedFormation={selectedFormation}
          onSelectFormation={handleApplyFormation}
          onResetFormation={() => handleApplyFormation(selectedFormation)}
        />

        {/* 3. Club & Season Presets */}
        <FormationCustomManager
          activeTeam={activeTeam}
          activeSlideId={activeSlideId}
          formationMode={formationMode}
        />

        {/* 4. Substitutes / Bench Area */}
        <FormationBenchSection
          activeSlideId={activeSlideId}
          activeTeam={activeTeam}
          teamColor={teamColor}
          benchPlayers={teamPlayers.bench}
          pitchPlayers={teamPlayers.pitch}
          onMoveToPitch={movePlayerToPitch}
          onSwapPlayers={swapPlayers}
          onAddPlayer={addCustomPlayer}
          onRemovePlayer={removePlayer}
        />
      </div>
    </div>
  );
}
