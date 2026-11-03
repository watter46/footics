'use client';

/**
 * formation-panel.tsx
 * Dedicated Right Panel: Formation Management, Team Configuration & Batch Player Display
 */

import { Shield } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { isVerticalPitch } from '@/features/tactical-unified/stores/slide-flip-helpers';
import { selectActiveSlide } from '@/features/tactical-unified/stores/tactical-unified-store';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import type { FormationMode, FormationType } from '@/lib/data/formations';
import { FormationPresetSelector } from './formation-preset-selector';
import { FormationTeamToggle } from './formation-team-toggle';

export function FormationPanel() {
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const project = useTacticalUnifiedStoreContext((s) => s.project);

  // Store actions
  const applyFormation = useTacticalUnifiedStoreContext(
    (s) => s.applyFormation,
  );
  const clearPitchPlayers = useTacticalUnifiedStoreContext(
    (s) => s.clearPitchPlayers,
  );
  const updatePlayer = useTacticalUnifiedStoreContext((s) => s.updatePlayer);
  const setTeamColor = useTacticalUnifiedStoreContext((s) => s.setTeamColor);
  const setBallSizeScale = useTacticalUnifiedStoreContext(
    (s) => s.setBallSizeScale,
  );
  const swapTeamSides = useTacticalUnifiedStoreContext((s) => s.swapTeamSides);

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

  const targetPitchPlayers = useMemo(() => {
    if (!activeSlide) return [];
    return activeSlide.players.filter(
      (p) =>
        p.area === 'pitch' && (activeTeam === 'both' || p.team === activeTeam),
    );
  }, [activeSlide, activeTeam]);

  const currentInsideContent =
    targetPitchPlayers[0]?.style.insideContent ?? 'number';
  const currentBottomLabel = targetPitchPlayers[0]?.style.bottomLabel ?? 'name';
  const currentMarkerScale = targetPitchPlayers[0]?.style.sizeScale ?? 1.0;
  const currentBallScale = activeSlide?.ball.sizeScale ?? 1.0;

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

  const handleBottomLabelChange = (label: 'name' | 'number' | 'none') => {
    if (!activeSlide) return;
    const targetPlayers =
      activeTeam === 'both'
        ? activeSlide.players
        : activeSlide.players.filter((p) => p.team === activeTeam);

    for (const p of targetPlayers) {
      updatePlayer(activeSlideId, p.id, {
        style: { ...p.style, bottomLabel: label },
      });
    }
  };

  const handleMarkerScaleChange = (scale: number) => {
    if (!activeSlide) return;
    const targetPlayers =
      activeTeam === 'both'
        ? activeSlide.players
        : activeSlide.players.filter((p) => p.team === activeTeam);

    for (const p of targetPlayers) {
      updatePlayer(activeSlideId, p.id, {
        style: { ...p.style, sizeScale: scale },
      });
    }
  };

  const handleBallScaleChange = (scale: number) => {
    if (!activeSlideId) return;
    setBallSizeScale(activeSlideId, scale);
  };

  return (
    <div className="flex flex-col h-full bg-[#121214] text-white text-xs select-none">
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
        {/* 1. Team Configuration & Marker/Ball Settings */}
        <FormationTeamToggle
          activeTeam={activeTeam}
          onTeamChange={setActiveTeam}
          homeColor={project.homeColor.primary}
          awayColor={project.awayColor.primary}
          onColorChange={setTeamColor}
          teamPlayersCount={teamPlayersCount}
          currentInsideContent={currentInsideContent}
          onDisplayModeChange={handleDisplayModeChange}
          currentBottomLabel={currentBottomLabel}
          onBottomLabelChange={handleBottomLabelChange}
          currentMarkerScale={currentMarkerScale}
          onMarkerScaleChange={handleMarkerScaleChange}
          currentBallScale={currentBallScale}
          onBallScaleChange={handleBallScaleChange}
        />

        {/* 2. Formation Presets Section Header & Selector */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] shrink-0 bg-[#18181B]">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-[#60A5FA]" />
              <span className="font-semibold text-white/90">
                Formation Presets
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Half / Full Pitch Toggle */}
              <div className="flex items-center bg-black/40 rounded border border-white/[0.08] p-0.5">
                <button
                  type="button"
                  onClick={() => setFormationMode('half')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    formationMode === 'half'
                      ? 'bg-[#FF8100]/24 text-[#FFA336] border border-[#FF8100]/80 ring-1 ring-[#FF8100]/40 shadow-[0_0_14px_rgba(255,129,0,0.5)]'
                      : 'text-white/50 hover:text-white border border-transparent'
                  }`}
                >
                  Half
                </button>
                <button
                  type="button"
                  onClick={() => setFormationMode('full')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    formationMode === 'full'
                      ? 'bg-[#FF8100]/24 text-[#FFA336] border border-[#FF8100]/80 ring-1 ring-[#FF8100]/40 shadow-[0_0_14px_rgba(255,129,0,0.5)]'
                      : 'text-white/50 hover:text-white border border-transparent'
                  }`}
                >
                  Full
                </button>
              </div>
            </div>
          </div>

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
    </div>
  );
}
