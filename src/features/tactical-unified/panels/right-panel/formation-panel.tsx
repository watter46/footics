'use client';

/**
 * formation-panel.tsx
 * Dedicated Right Panel: Formation Management, Team Configuration & Batch Player Display
 */

import { Shield } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  selectDomainActivePhaseAspectRatio,
  selectDomainActiveSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import { isVerticalPitch } from '@/features/tactical-unified/stores/slide-flip-helpers';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { FormationMode, FormationType } from '@/lib/data/formations';
import { computeDomainSlideAfterFormation } from '@/lib/tactical/domain/formation-placement';
import { FormationPresetSelector } from './formation-preset-selector';
import { FormationTeamToggle } from './formation-team-toggle';

export function FormationPanel() {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const project = useDocumentStore((s) => s.project);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  );
  const aspectRatio = selectDomainActivePhaseAspectRatio(
    project,
    activePhaseId,
  );

  const isVertical = isVerticalPitch(aspectRatio);

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

  const targetTeamPlayers = useMemo(() => {
    if (!activeSlide) return [];
    return activeSlide.players.filter(
      (p) => activeTeam === 'both' || p.team === activeTeam,
    );
  }, [activeSlide, activeTeam]);

  const targetPitchPlayers = useMemo(() => {
    return targetTeamPlayers.filter((p) => p.area === 'pitch');
  }, [targetTeamPlayers]);

  const representativePlayer = targetPitchPlayers[0] ?? targetTeamPlayers[0];

  const currentInsideContent =
    representativePlayer?.style.insideContent ?? 'number';
  const currentBottomLabel = representativePlayer?.style.bottomLabel ?? 'name';
  const currentMarkerScale = representativePlayer?.style.sizeScale ?? 1.0;
  const currentBallScale = activeSlide?.ball.sizeScale ?? 1.0;

  const handleApplyFormation = (f: FormationType) => {
    setSelectedFormation(f);
    if (!activePhaseId || !activeSlideId || !activeSlide) return;
    const targetTeam: 'home' | 'away' =
      activeTeam === 'both' ? 'home' : activeTeam;
    const nextPlayers = computeDomainSlideAfterFormation(
      activeSlide,
      project,
      aspectRatio,
      f,
      formationMode,
      targetTeam,
    );
    dispatch({
      type: 'APPLY_SLIDE_COMMAND',
      phaseId: activePhaseId,
      slideId: activeSlideId,
      command: { type: 'REPLACE_PLAYERS', players: nextPlayers },
    });
  };

  const applyBatchPlayerStyle = (
    stylePatch: Partial<{
      insideContent: 'number' | 'photo' | 'none';
      bottomLabel: 'name' | 'number' | 'none';
      sizeScale: number;
    }>,
  ) => {
    if (!activePhaseId || !activeSlideId || !activeSlide) return;
    const nextPlayers = activeSlide.players.map((p) => {
      if (activeTeam !== 'both' && p.team !== activeTeam) return p;
      return { ...p, style: { ...p.style, ...stylePatch } };
    });
    dispatch({
      type: 'APPLY_SLIDE_COMMAND',
      phaseId: activePhaseId,
      slideId: activeSlideId,
      command: { type: 'REPLACE_PLAYERS', players: nextPlayers },
    });
  };

  const handleDisplayModeChange = (mode: 'number' | 'photo' | 'none') => {
    applyBatchPlayerStyle({ insideContent: mode });
  };

  const handleBottomLabelChange = (label: 'name' | 'number' | 'none') => {
    applyBatchPlayerStyle({ bottomLabel: label });
  };

  const handleMarkerScaleChange = (scale: number) => {
    applyBatchPlayerStyle({ sizeScale: scale });
  };

  const handleBallScaleChange = (scale: number) => {
    if (!activePhaseId || !activeSlideId) return;
    dispatch({
      type: 'APPLY_SLIDE_COMMAND',
      phaseId: activePhaseId,
      slideId: activeSlideId,
      command: { type: 'UPDATE_BALL', patch: { sizeScale: scale } },
    });
  };

  const handleApplyToAllPhaseSlides = () => {
    if (!activePhaseId) return;
    dispatch({
      type: 'APPLY_PLAYER_STYLE_TO_PHASE_SLIDES',
      phaseId: activePhaseId,
      stylePatch: {
        insideContent: currentInsideContent,
        bottomLabel: currentBottomLabel,
        sizeScale: currentMarkerScale,
      },
      targetTeam: activeTeam,
    });
    dispatch({
      type: 'APPLY_BALL_SCALE_TO_PHASE_SLIDES',
      phaseId: activePhaseId,
      sizeScale: currentBallScale,
    });
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
          onColorChange={(team, color) =>
            dispatch({ type: 'SET_TEAM_COLOR', team, primary: color })
          }
          teamPlayersCount={teamPlayersCount}
          currentInsideContent={currentInsideContent}
          onDisplayModeChange={handleDisplayModeChange}
          currentBottomLabel={currentBottomLabel}
          onBottomLabelChange={handleBottomLabelChange}
          currentMarkerScale={currentMarkerScale}
          onMarkerScaleChange={handleMarkerScaleChange}
          currentBallScale={currentBallScale}
          onBallScaleChange={handleBallScaleChange}
          onApplyToPhaseSlides={handleApplyToAllPhaseSlides}
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
            onClearPitch={() => {
              if (!activePhaseId || !activeSlideId) return;
              dispatch({
                type: 'APPLY_SLIDE_COMMAND',
                phaseId: activePhaseId,
                slideId: activeSlideId,
                command: { type: 'CLEAR_PITCH_PLAYERS' },
              });
            }}
            onSwapSides={() => {
              if (!activePhaseId || !activeSlideId) return;
              dispatch({
                type: 'APPLY_SLIDE_COMMAND',
                phaseId: activePhaseId,
                slideId: activeSlideId,
                command: { type: 'SWAP_TEAM_SIDES' },
              });
            }}
            isVertical={isVertical}
          />
        </div>
      </div>
    </div>
  );
}
