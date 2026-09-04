'use client';

import { ChevronDown, Shield } from 'lucide-react';
import { useState } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { FormationMode } from '@/lib/data/formations';
import { getPlayerMastersBySeason } from '@/lib/db/queries';
import {
  CHELSEA_PRESETS_BY_SEASON,
  type PresetPlayer,
} from '@/lib/tactical/chelsea-preset';
import { injectTeamSquadToTactical } from '@/lib/tactical/squad-to-tactical-bridge';
import { SUPPORTED_TEAMS } from '@/lib/tactical/teams-config';
import type { SeasonFormationPreset } from '@/lib/types/tactical-unified';
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
  const applyFormationPreset = useTacticalUnifiedStore(
    (s) => s.applyFormationPreset,
  );

  const handleApplySeasonPreset = (preset: SeasonFormationPreset) => {
    applyFormationPreset(
      {
        name: preset.name,
        team: activeTeam,
        players: preset.players,
      },
      activeSlideId,
    );
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
        const masters = await getPlayerMastersBySeason('26-27', 'Chelsea');
        masters.forEach((m) => {
          masterMap.set(m.playerId, m);
        });
      } catch (err) {
        console.warn('Failed to load masters from IndexedDB', err);
      }

      injectTeamSquadToTactical({
        teamName: 'Chelsea FC',
        team: activeTeam,
        players: chelseaPreset.map((p: PresetPlayer) => {
          const m = masterMap.get(p.playerId);
          return {
            playerId: p.playerId,
            name: p.name,
            shirtNo: p.shirtNo,
            position: p.position,
            isFirstEleven: !p.isFirstEleven,
            field: activeTeam,
            stats: {},
            height: 180,
            weight: 75,
            age: 24,
            isManOfTheMatch: false,
            photoBlob: m?.photoBlob,
            photoUrl: m?.photoUrl,
          };
        }),
        formation: '4-2-3-1',
        mode: formationMode,
        slideId: activeSlideId,
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
        <div className="mt-2 space-y-2.5 p-2 bg-black/40 rounded-lg border border-white/10">
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
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-blue-600/20 hover:text-blue-300 text-left text-[10px] text-white/80 transition-colors truncate cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
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
