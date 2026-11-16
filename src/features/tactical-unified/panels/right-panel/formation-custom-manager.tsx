'use client';

import { ChevronDown, Shield } from 'lucide-react';
import { useState } from 'react';
import { fetchPlayerMastersBySeason } from '@/features/tactical-unified/hooks/use-player-masters';
import {
  selectDomainActivePhaseAspectRatio,
  selectDomainActiveSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { FormationMode } from '@/lib/data/formations';
import {
  CHELSEA_PRESETS_BY_SEASON,
  type PresetPlayer,
} from '@/lib/tactical/chelsea-preset';
import {
  buildDomainSquadPlayers,
  computeDomainPresetPlayers,
  type DomainSquadPlayerItem,
} from '@/lib/tactical/domain/squad-placement';
import { SUPPORTED_TEAMS } from '@/lib/tactical/teams-config';
import type { SeasonFormationPreset } from '@/lib/types/tactical/project-config';
import { SAMPLE_SEASON_PRESETS } from './formation-presets-data';

interface FormationCustomManagerProps {
  activeTeam: 'home' | 'away';
  activeSlideId: string;
  formationMode: FormationMode;
}

export function FormationCustomManager({
  activeTeam,
  activeSlideId,
  formationMode,
}: FormationCustomManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const sessionActiveSlideId = useSessionStore((s) => s.activeSlideId);
  const project = useDocumentStore((s) => s.project);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const targetSlideId = activeSlideId || sessionActiveSlideId;
  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    targetSlideId,
  );
  const aspectRatio = selectDomainActivePhaseAspectRatio(
    project,
    activePhaseId,
  );

  const handleApplySeasonPreset = (preset: SeasonFormationPreset) => {
    if (!activePhaseId || !targetSlideId || !activeSlide) return;
    const nextPlayers = computeDomainPresetPlayers(
      activeSlide,
      project,
      activeTeam,
      preset,
    );
    dispatch({
      type: 'APPLY_SLIDE_COMMAND',
      phaseId: activePhaseId,
      slideId: targetSlideId,
      command: { type: 'REPLACE_PLAYERS', players: nextPlayers },
    });
  };

  const handleApplyClubPreset = async (teamSlug: string) => {
    if (teamSlug === 'chelsea') {
      const chelseaPreset =
        CHELSEA_PRESETS_BY_SEASON['26-27'] ||
        CHELSEA_PRESETS_BY_SEASON['24-25'] ||
        [];

      const masterMap = new Map<
        number,
        { photoBlob?: Blob; photoUrl?: string }
      >();
      try {
        const masters = await fetchPlayerMastersBySeason('26-27', 'Chelsea');
        masters.forEach((m) => {
          masterMap.set(m.playerId, m);
        });
      } catch (err) {
        console.warn('Failed to load masters from IndexedDB', err);
      }

      if (!activePhaseId || !targetSlideId || !activeSlide) return;
      const squadItems: DomainSquadPlayerItem[] = chelseaPreset.map(
        (p: PresetPlayer) => {
          const m = masterMap.get(p.playerId);
          return {
            playerId: p.playerId,
            name: p.name,
            shirtNo: p.shirtNo,
            position: p.position,
            isFirstEleven: Boolean(p.isFirstEleven),
            photoBlob: m?.photoBlob,
            photoUrl: m?.photoUrl,
          };
        },
      );
      const primaryColor =
        activeTeam === 'home'
          ? project.homeColor.primary
          : project.awayColor.primary;
      const teamPlayers = buildDomainSquadPlayers(squadItems, {
        team: activeTeam,
        formation: '4-2-3-1',
        mode: formationMode,
        primaryColor,
        aspectRatio,
      });
      const otherPlayers = activeSlide.players.filter(
        (p) => p.team !== activeTeam,
      );
      dispatch({
        type: 'APPLY_SLIDE_COMMAND',
        phaseId: activePhaseId,
        slideId: targetSlideId,
        command: {
          type: 'REPLACE_PLAYERS',
          players: [...otherPlayers, ...teamPlayers],
        },
      });
    }
  };

  return (
    <div className="p-2.5">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between w-full text-[11px] font-semibold text-white/70 hover:text-white transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <Shield size={12} className="text-amber-400" />
          <span>Club & Season Presets</span>
        </span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="mt-2 space-y-2.5 p-2 bg-black/40 rounded-lg border border-white/[0.08]">
          <div>
            <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
              Registered Clubs
            </span>
            <div className="grid grid-cols-2 gap-1">
              {SUPPORTED_TEAMS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleApplyClubPreset(t.id)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-[#60A5FA]/15 hover:text-[#60A5FA] text-left text-[10px] text-white/80 transition-colors truncate cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#60A5FA] shrink-0" />
                  <span className="truncate">{t.shortName}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-white/5">
            <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
              Tactical Presets
            </span>
            <div className="space-y-1">
              {SAMPLE_SEASON_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplySeasonPreset(preset)}
                  className="flex items-center justify-between w-full px-2 py-1 rounded bg-white/5 hover:bg-white/15 text-left text-[11px] text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="font-medium">{preset.name}</span>
                  <span className="text-[10px] text-white/40">
                    {preset.season}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
