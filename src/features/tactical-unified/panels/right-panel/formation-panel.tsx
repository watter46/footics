'use client';

/**
 * formation-panel.tsx
 * Dedicated Right Panel: Formation Management, Team Configuration & Batch Player Display
 */

import { Shield } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { isVerticalPitch } from '@/features/tactical-unified/stores/slide-flip-helpers';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import type { FormationMode, FormationType } from '@/lib/data/formations';
import { FormationPresetSelector } from './formation-preset-selector';
import { FormationTeamToggle } from './formation-team-toggle';

export function FormationPanel() {
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const project = useTacticalUnifiedStore((s) => s.project);

  // Store actions
  const applyFormation = useTacticalUnifiedStore((s) => s.applyFormation);
  const clearPitchPlayers = useTacticalUnifiedStore((s) => s.clearPitchPlayers);
  const updatePlayer = useTacticalUnifiedStore((s) => s.updatePlayer);
  const setTeamColor = useTacticalUnifiedStore((s) => s.setTeamColor);
  const teamVisibility = useTacticalUnifiedStore((s) => s.teamVisibility);
  const setTeamVisibility = useTacticalUnifiedStore((s) => s.setTeamVisibility);
  const swapTeamSides = useTacticalUnifiedStore((s) => s.swapTeamSides);

  const isVertical = isVerticalPitch(project.aspectRatio);

  // Local states
  const [activeTeam, setActiveTeam] = useState<'home' | 'away' | 'both'>(
    'home',
  );
  const [formationMode, setFormationMode] = useState<FormationMode>('full');
  const [selectedFormation, setSelectedFormation] =
    useState<FormationType>('4-3-3');

  useEffect(() => {
    if (!project.matchFormations) return;
    const targetFormation =
      activeTeam === 'away'
        ? project.matchFormations.away
        : project.matchFormations.home;
    if (targetFormation) {
      setSelectedFormation(targetFormation);
    }
  }, [project.matchFormations, activeTeam]);

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

  const handleApplyFormation = (f: FormationType) => {
    setSelectedFormation(f);
    applyFormation(activeSlideId, f, formationMode, activeTeam);
  };

  const handleDisplayModeChange = (mode: 'number' | 'photo' | 'none') => {
    if (!activeSlide) return;
    const targetPlayers =
      activeTeam === 'both'
        ? activeSlide.players
        : activeSlide.players.filter((p) => p.team === activeTeam);

    for (const p of targetPlayers) {
      updatePlayer(activeSlideId, p.id, {
        style: { ...p.style, insideContent: mode },
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#141414] text-white text-xs select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0 bg-[#181818]">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-blue-400" />
          <span className="font-semibold text-white/90">Formation Presets</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Half / Full Pitch Toggle */}
          <div className="flex items-center bg-black/40 rounded border border-white/10 p-0.5">
            <button
              type="button"
              onClick={() => setFormationMode('half')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                formationMode === 'half'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Half
            </button>
            <button
              type="button"
              onClick={() => setFormationMode('full')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                formationMode === 'full'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Full
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
        {/* 1. Team Control Bar & Batch Display Mode */}
        <FormationTeamToggle
          activeTeam={activeTeam}
          onTeamChange={setActiveTeam}
          homeColor={project.homeColor.primary}
          awayColor={project.awayColor.primary}
          onColorChange={setTeamColor}
          teamPlayersCount={teamPlayersCount}
          teamVisibility={teamVisibility}
          onVisibilityChange={setTeamVisibility}
          onDisplayModeChange={handleDisplayModeChange}
        />

        {/* 2. Quick Formations & Pitch Actions */}
        <FormationPresetSelector
          selectedFormation={selectedFormation}
          onSelectFormation={handleApplyFormation}
          onResetFormation={() => handleApplyFormation(selectedFormation)}
          onClearPitch={() => clearPitchPlayers(activeSlideId)}
          onSwapSides={() => swapTeamSides(activeSlideId)}
          isVertical={isVertical}
        />
      </div>
    </div>
  );
}
