'use client';

/**
 * formation-panel.tsx
 * Dedicated Right Panel: Formation Management, Team Configuration & Batch Player Display
 *
 * Features:
 *  - Home / Away team selection & integrated team color customization
 *  - Batch Player Display (All / Home / Away: Number / Photo / Empty)
 *  - Team pitch visibility toggles (Both / Home / Away)
 *  - Full / Half formation geometry mode presets (28 standard formations)
 *  - Instant formation reset
 *  - Club presets & Season presets (Chelsea, Man City, Arsenal, etc.)
 */

import {
  ChevronDown,
  Circle,
  Eye,
  Hash,
  ImageIcon,
  Palette,
  RotateCcw,
  Search,
  Shield,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  FORMATION_LIST,
  type FormationMode,
  type FormationType,
} from '@/lib/data/formations';
import { getPlayerMastersBySeason } from '@/lib/db/queries';
import {
  CHELSEA_PRESETS_BY_SEASON,
  type PresetPlayer,
} from '@/lib/tactical/chelsea-preset';
import { injectTeamSquadToTactical } from '@/lib/tactical/squad-to-tactical-bridge';
import { SUPPORTED_TEAMS } from '@/lib/tactical/teams-config';
import type { SeasonFormationPreset } from '@/lib/types/tactical-unified';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';
import { ColorInput } from '../common-color-input';

// ── Season Preset Sample Data ──────────────────────────────────
const SAMPLE_SEASON_PRESETS: SeasonFormationPreset[] = [
  {
    id: 'preset-chelsea-2425',
    name: 'Chelsea 24/25 (4-2-3-1)',
    teamName: 'Chelsea FC',
    season: '2024-25',
    mode: 'half',
    formation: '4-2-3-1',
    players: [
      { shirtNo: '1', position: 'GK', x: 8, y: 50 },
      { shirtNo: '27', position: 'RB', x: 22, y: 18 },
      { shirtNo: '29', position: 'CB', x: 20, y: 38 },
      { shirtNo: '6', position: 'CB', x: 20, y: 62 },
      { shirtNo: '3', position: 'LB', x: 22, y: 82 },
      { shirtNo: '25', position: 'DM', x: 34, y: 38 },
      { shirtNo: '8', position: 'DM', x: 34, y: 62 },
      { shirtNo: '11', position: 'RW', x: 44, y: 18 },
      { shirtNo: '20', position: 'AM', x: 45, y: 50 },
      { shirtNo: '7', position: 'LW', x: 44, y: 82 },
      { shirtNo: '15', position: 'ST', x: 52, y: 50 },
    ],
  },
  {
    id: 'preset-mancity-2425',
    name: 'Man City 24/25 (3-2-4-1)',
    teamName: 'Manchester City',
    season: '2024-25',
    mode: 'half',
    formation: '3-2-4-1',
    players: [
      { shirtNo: '31', position: 'GK', x: 8, y: 50 },
      { shirtNo: '25', position: 'CB', x: 20, y: 25 },
      { shirtNo: '3', position: 'CB', x: 18, y: 50 },
      { shirtNo: '24', position: 'CB', x: 20, y: 75 },
      { shirtNo: '16', position: 'DM', x: 32, y: 38 },
      { shirtNo: '82', position: 'DM', x: 32, y: 62 },
      { shirtNo: '20', position: 'RW', x: 46, y: 15 },
      { shirtNo: '17', position: 'AM', x: 45, y: 38 },
      { shirtNo: '47', position: 'AM', x: 45, y: 62 },
      { shirtNo: '11', position: 'LW', x: 46, y: 85 },
      { shirtNo: '9', position: 'ST', x: 54, y: 50 },
    ],
  },
];

export function FormationPanel() {
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const project = useTacticalUnifiedStore((s) => s.project);

  // Store actions
  const applyFormation = useTacticalUnifiedStore((s) => s.applyFormation);
  const applyFormationPreset = useTacticalUnifiedStore(
    (s) => s.applyFormationPreset,
  );
  const updatePlayer = useTacticalUnifiedStore((s) => s.updatePlayer);
  const setTeamColor = useTacticalUnifiedStore((s) => s.setTeamColor);
  const teamVisibility = useTacticalUnifiedStore((s) => s.teamVisibility);
  const setTeamVisibility = useTacticalUnifiedStore((s) => s.setTeamVisibility);

  // Local states
  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');
  const [formationMode, setFormationMode] = useState<FormationMode>('half');
  const [selectedFormation, setSelectedFormation] =
    useState<FormationType>('4-3-3');
  const [formationSearch, setFormationSearch] = useState('');
  const [showSeasonPresets, setShowSeasonPresets] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

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

  const filteredFormations = useMemo(() => {
    if (!formationSearch.trim()) return FORMATION_LIST;
    return FORMATION_LIST.filter((f) =>
      f.toLowerCase().includes(formationSearch.trim().toLowerCase()),
    );
  }, [formationSearch]);

  const teamColor =
    activeTeam === 'home'
      ? project.homeColor.primary
      : project.awayColor.primary;

  const handleApplyFormation = (f: FormationType) => {
    setSelectedFormation(f);
    applyFormation(activeSlideId, f, formationMode, activeTeam);
  };

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
            isFirstEleven: !!p.isFirstEleven,
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
    <div className="flex flex-col h-full bg-[#141414] text-white text-xs select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 shrink-0 bg-[#181818]">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-blue-400" />
          <span className="font-semibold text-white/90">Formation Presets</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
        {/* 1. Team Selection (Home / Away) & Integrated Team Color */}
        <div className="p-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-1.5 p-0.5 rounded-lg bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTeam('home')}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md font-medium transition-all cursor-pointer ${
                activeTeam === 'home'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/30"
                style={{ backgroundColor: project.homeColor.primary }}
              />
              <span>HOME</span>
              <span className="text-[10px] opacity-70">
                ({teamPlayersCount.home})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTeam('away')}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md font-medium transition-all cursor-pointer ${
                activeTeam === 'away'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/30"
                style={{ backgroundColor: project.awayColor.primary }}
              />
              <span>AWAY</span>
              <span className="text-[10px] opacity-70">
                ({teamPlayersCount.away})
              </span>
            </button>
          </div>

          {/* Team Color Quick Customization */}
          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/10 space-y-2">
            <button
              type="button"
              onClick={() => setShowColorPicker((v) => !v)}
              className="flex items-center justify-between w-full text-[11px] font-medium text-white/70 hover:text-white cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Palette size={12} className="text-blue-400" />
                <span>
                  {activeTeam === 'home' ? 'Home' : 'Away'} Team Color
                </span>
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-white/50">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/30 inline-block"
                  style={{ backgroundColor: teamColor }}
                />
                {teamColor}
                <ChevronDown
                  size={11}
                  className={`transition-transform ${showColorPicker ? 'rotate-180' : ''}`}
                />
              </span>
            </button>

            {showColorPicker && (
              <div className="pt-2 border-t border-white/5">
                <ColorInput
                  value={teamColor}
                  onChange={(c) => setTeamColor(activeTeam, c)}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Team Visibility Filter */}
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/10">
            <span className="text-[11px] font-medium text-white/70 flex items-center gap-1.5">
              <Eye size={12} className="text-blue-400" />
              <span>Pitch Visibility</span>
            </span>
            <div className="flex items-center bg-black/40 rounded border border-white/10 p-0.5">
              <button
                type="button"
                onClick={() => setTeamVisibility('both')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                  teamVisibility === 'both'
                    ? 'bg-white/20 text-white font-semibold shadow-xs'
                    : 'text-white/50 hover:text-white'
                }`}
                title="Show both teams on pitch"
              >
                Both
              </button>
              <button
                type="button"
                onClick={() => setTeamVisibility('home')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                  teamVisibility === 'home'
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-white/50 hover:text-white'
                }`}
                title="Show Home team only"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => setTeamVisibility('away')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                  teamVisibility === 'away'
                    ? 'bg-red-600 text-white font-semibold shadow-xs'
                    : 'text-white/50 hover:text-white'
                }`}
                title="Show Away team only"
              >
                Away
              </button>
            </div>
          </div>

          {/* Batch Player Display Settings (Inside Content: Number / Photo / Empty) */}
          {activeSlide && (
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/10 space-y-2">
              <span className="text-[11px] font-semibold text-white/80 flex items-center gap-1.5">
                <Users size={12} className="text-blue-400" />
                <span>Batch Player Display</span>
              </span>

              <div className="space-y-1.5">
                {/* All Players */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/60 font-medium">All Players</span>
                  <div className="flex items-center gap-1 bg-black/40 rounded-md border border-white/10 p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        activeSlide.players.forEach((p) => {
                          updatePlayer(activeSlide.id, p.id, {
                            style: { ...p.style, insideContent: 'number' },
                          });
                        });
                      }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
                      title="Set Number for all players"
                    >
                      <Hash size={10} />
                      <span>Num</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        activeSlide.players.forEach((p) => {
                          updatePlayer(activeSlide.id, p.id, {
                            style: { ...p.style, insideContent: 'photo' },
                          });
                        });
                      }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
                      title="Set Photo for all players (where photo exists)"
                    >
                      <ImageIcon size={10} />
                      <span>Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        activeSlide.players.forEach((p) => {
                          updatePlayer(activeSlide.id, p.id, {
                            style: { ...p.style, insideContent: 'none' },
                          });
                        });
                      }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
                      title="Set Empty for all players"
                    >
                      <Circle size={10} />
                      <span>Empty</span>
                    </button>
                  </div>
                </div>

                {/* Home Team */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-blue-400 flex items-center gap-1.5 font-medium">
                    <span
                      className="w-2 h-2 rounded-full shadow-xs"
                      style={{ backgroundColor: project.homeColor.primary }}
                    />
                    Home
                  </span>
                  <div className="flex items-center gap-1 bg-black/40 rounded-md border border-white/10 p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        activeSlide.players
                          .filter((p) => p.team === 'home')
                          .forEach((p) => {
                            updatePlayer(activeSlide.id, p.id, {
                              style: { ...p.style, insideContent: 'number' },
                            });
                          });
                      }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
                    >
                      <Hash size={10} />
                      <span>Num</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        activeSlide.players
                          .filter((p) => p.team === 'home')
                          .forEach((p) => {
                            updatePlayer(activeSlide.id, p.id, {
                              style: { ...p.style, insideContent: 'photo' },
                            });
                          });
                      }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
                    >
                      <ImageIcon size={10} />
                      <span>Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        activeSlide.players
                          .filter((p) => p.team === 'home')
                          .forEach((p) => {
                            updatePlayer(activeSlide.id, p.id, {
                              style: { ...p.style, insideContent: 'none' },
                            });
                          });
                      }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
                    >
                      <Circle size={10} />
                      <span>Empty</span>
                    </button>
                  </div>
                </div>

                {/* Away Team */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-red-400 flex items-center gap-1.5 font-medium">
                    <span
                      className="w-2 h-2 rounded-full shadow-xs"
                      style={{ backgroundColor: project.awayColor.primary }}
                    />
                    Away
                  </span>
                  <div className="flex items-center gap-1 bg-black/40 rounded-md border border-white/10 p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        activeSlide.players
                          .filter((p) => p.team === 'away')
                          .forEach((p) => {
                            updatePlayer(activeSlide.id, p.id, {
                              style: { ...p.style, insideContent: 'number' },
                            });
                          });
                      }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
                    >
                      <Hash size={10} />
                      <span>Num</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        activeSlide.players
                          .filter((p) => p.team === 'away')
                          .forEach((p) => {
                            updatePlayer(activeSlide.id, p.id, {
                              style: { ...p.style, insideContent: 'photo' },
                            });
                          });
                      }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
                    >
                      <ImageIcon size={10} />
                      <span>Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        activeSlide.players
                          .filter((p) => p.team === 'away')
                          .forEach((p) => {
                            updatePlayer(activeSlide.id, p.id, {
                              style: { ...p.style, insideContent: 'none' },
                            });
                          });
                      }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
                    >
                      <Circle size={10} />
                      <span>Empty</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Formation Presets & Reset */}
        <div className="p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
              Formation
            </span>
            <div className="flex items-center gap-1.5">
              {/* Formation Reset */}
              <button
                type="button"
                onClick={() => handleApplyFormation(selectedFormation)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Reset to default formation positions"
              >
                <RotateCcw size={10} className="text-amber-400" />
                <span>Reset</span>
              </button>

              {/* Full / Half Toggle */}
              <div className="flex items-center bg-black/40 rounded border border-white/10 p-0.5">
                <button
                  type="button"
                  onClick={() => setFormationMode('half')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    formationMode === 'half'
                      ? 'bg-blue-600 text-white'
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
                      ? 'bg-blue-600 text-white'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  Full
                </button>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              placeholder="Search formations..."
              value={formationSearch}
              onChange={(e) => setFormationSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1 rounded bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Quick Selection Chips */}
          <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1 bg-black/30 rounded border border-white/5 custom-scrollbar">
            {filteredFormations.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => handleApplyFormation(f)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  selectedFormation === f
                    ? 'bg-blue-600 text-white font-bold shadow'
                    : 'bg-white/5 text-white/70 hover:bg-white/15 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Registered Club & Season Presets */}
          <div className="space-y-1.5 pt-1">
            <button
              type="button"
              onClick={() => setShowSeasonPresets((v) => !v)}
              className="flex items-center justify-between w-full text-[11px] text-white/60 hover:text-white py-1 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Shield size={12} className="text-amber-400" />
                <span>Club & Season Presets</span>
              </span>
              <ChevronDown
                size={12}
                className={`transition-transform ${showSeasonPresets ? 'rotate-180' : ''}`}
              />
            </button>

            {showSeasonPresets && (
              <div className="space-y-2 mt-1 p-2 bg-black/40 rounded border border-white/10">
                {/* Registered Clubs quick load */}
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

                {/* Sample Presets */}
                <div className="pt-1.5 border-t border-white/5">
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
        </div>
      </div>
    </div>
  );
}
