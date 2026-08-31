'use client';

/**
 * formation-sub-panel.tsx
 * Figma-like Right Panel: Formation & Squad (Sub-members) management
 *
 * Features:
 *  - Home / Away team selection & integrated team color customization
 *  - Full / Half formation presets (from existing Footics formations)
 *  - Club presets & Season presets (Chelsea, Man City, Arsenal, etc.)
 *  - Unlimited pitch players list with selection and "Send to Bench"
 *  - Bench/Sub-members list with free D&D to pitch and instant placement
 *  - Add custom sub player
 */

import {
  ArrowLeftRight,
  ChevronDown,
  Eye,
  Palette,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import {
  FORMATION_LIST,
  type FormationMode,
  type FormationType,
} from '@/lib/data/formations';
import {
  CHELSEA_PRESETS_BY_SEASON,
  type PresetPlayer,
} from '@/lib/tactical/chelsea-preset';
import {
  getPositionBadgeClass,
  groupPlayersByPosition,
  POSITION_GROUP_LABELS,
  POSITION_GROUPS,
  type PositionGroup,
} from '@/lib/tactical/player-formatting';
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

export function FormationSubPanel() {
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const project = useTacticalUnifiedStore((s) => s.project);
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);
  const setRightPanelTab = useTacticalUnifiedStore((s) => s.setRightPanelTab);

  // Store actions
  const applyFormation = useTacticalUnifiedStore((s) => s.applyFormation);
  const applyFormationPreset = useTacticalUnifiedStore(
    (s) => s.applyFormationPreset,
  );
  const movePlayerToBench = useTacticalUnifiedStore((s) => s.movePlayerToBench);
  const movePlayerToPitch = useTacticalUnifiedStore((s) => s.movePlayerToPitch);
  const swapPlayers = useTacticalUnifiedStore((s) => s.swapPlayers);
  const addCustomPlayer = useTacticalUnifiedStore((s) => s.addCustomPlayer);
  const removePlayer = useTacticalUnifiedStore((s) => s.removePlayer);
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

  // Swap & Accordion states
  const [activeSwapPlayerId, setActiveSwapPlayerId] = useState<string | null>(
    null,
  );
  const [openPitchSections, setOpenPitchSections] = useState<
    Record<PositionGroup, boolean>
  >({
    GK: true,
    DF: true,
    MF: true,
    FW: true,
    OTHER: true,
  });
  const [openBenchSections, setOpenBenchSections] = useState<
    Record<PositionGroup, boolean>
  >({
    GK: true,
    DF: true,
    MF: true,
    FW: true,
    OTHER: true,
  });

  // New sub player inputs
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

  const pitchGroups = useMemo(
    () => groupPlayersByPosition(teamPlayers.pitch),
    [teamPlayers.pitch],
  );

  const benchGroups = useMemo(
    () => groupPlayersByPosition(teamPlayers.bench),
    [teamPlayers.bench],
  );

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

  const handleApplyClubPreset = (teamSlug: string) => {
    if (teamSlug === 'chelsea') {
      const chelseaPreset =
        CHELSEA_PRESETS_BY_SEASON['26-27'] ||
        CHELSEA_PRESETS_BY_SEASON['24-25'] ||
        [];
      injectTeamSquadToTactical({
        teamName: 'Chelsea FC',
        team: activeTeam,
        players: chelseaPreset.map((p: PresetPlayer) => ({
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
        })),
        formation: '4-2-3-1',
        mode: formationMode,
        slideId: activeSlideId,
      });
    }
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
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 shrink-0 bg-[#181818]">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-blue-400" />
          <span className="font-semibold text-white/90">Formation & Squad</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
        {/* 1. Team Selection (Home / Away) & Integrated Team Color */}
        <div className="p-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-1.5 p-0.5 rounded-lg bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTeam('home')}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md font-medium transition-all ${
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
                ({teamPlayers.pitch.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTeam('away')}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md font-medium transition-all ${
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
                ({teamPlayers.pitch.length})
              </span>
            </button>
          </div>

          {/* Team Color Quick Customization */}
          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/10 space-y-2">
            <button
              type="button"
              onClick={() => setShowColorPicker((v) => !v)}
              className="flex items-center justify-between w-full text-[11px] font-medium text-white/70 hover:text-white"
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
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
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
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
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
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
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
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-white/80 hover:text-white transition-colors"
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
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
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
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
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
          <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1 bg-black/30 rounded border border-white/5 custom-scrollbar">
            {filteredFormations.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => handleApplyFormation(f)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-all ${
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
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setShowSeasonPresets((v) => !v)}
              className="flex items-center justify-between w-full text-[11px] text-white/60 hover:text-white py-1"
            >
              <span className="flex items-center gap-1.5">
                <Shield size={12} className="text-amber-400" />
                Club & Season Presets
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
                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-blue-600/20 hover:text-blue-300 text-left text-[10px] text-white/80 transition-colors truncate"
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
                        className="flex items-center justify-between w-full px-2 py-1 rounded bg-white/5 hover:bg-white/15 text-left text-[11px] text-white/80 hover:text-white transition-colors"
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

        {/* 3. Substitutes / Bench Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            try {
              const raw = e.dataTransfer.getData('application/json');
              if (!raw) return;
              const data = JSON.parse(raw);
              if (
                data.type === 'player' ||
                data.type === 'pitch-player' ||
                data.playerId
              ) {
                movePlayerToBench(activeSlideId, data.playerId);
              }
            } catch {}
          }}
          className="p-3 space-y-2.5 bg-white/[0.01]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                Substitutes ({teamPlayers.bench.length})
              </span>
              <span className="text-[9px] text-white/40">
                (Drag & drop to pitch)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingSub((v) => !v)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white/80 hover:text-white transition-colors"
            >
              <UserPlus size={11} />
              <span>Add</span>
            </button>
          </div>

          {/* New Sub Player Form */}
          {isAddingSub && (
            <form
              onSubmit={handleAddSub}
              className="p-2 rounded bg-black/40 border border-white/10 space-y-1.5"
            >
              <div className="grid grid-cols-3 gap-1">
                <input
                  type="text"
                  placeholder="No."
                  value={newSubNo}
                  onChange={(e) => setNewSubNo(e.target.value)}
                  className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs"
                />
                <input
                  type="text"
                  placeholder="Pos"
                  value={newSubPos}
                  onChange={(e) => setNewSubPos(e.target.value)}
                  className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs"
                />
                <button
                  type="submit"
                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Add Player
                </button>
              </div>
              <input
                type="text"
                placeholder="Player Name"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs"
              />
            </form>
          )}

          {/* Bench Players list (4-Position Grouping) */}
          {teamPlayers.bench.length === 0 ? (
            <div className="p-3 rounded border border-dashed border-white/10 text-center text-white/30 text-[11px]">
              No substitutes.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-0.5">
              {POSITION_GROUPS.filter(
                (grp) => grp !== 'OTHER' || benchGroups.OTHER.length > 0,
              ).map((grp) => {
                const groupPlayers = benchGroups[grp];
                const isOpen = openBenchSections[grp];
                return (
                  <div
                    key={`bench-grp-${grp}`}
                    className="rounded bg-black/20 border border-white/5 overflow-hidden"
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
                      className="w-full flex items-center justify-between px-2 py-1.5 bg-white/[0.03] hover:bg-white/[0.06] text-left transition-colors"
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

                    {/* Group Items */}
                    {isOpen && (
                      <div className="p-1 space-y-1">
                        {groupPlayers.length === 0 ? (
                          <div className="py-1 text-center text-[10px] text-white/20 italic">
                            No {POSITION_GROUP_LABELS[grp].toLowerCase()}
                          </div>
                        ) : (
                          groupPlayers.map((player) => (
                            <div key={player.id} className="space-y-1">
                              <div
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData(
                                    'application/json',
                                    JSON.stringify({
                                      type: 'sub-player',
                                      playerId: player.id,
                                      shirtNo: player.shirtNo,
                                      name: player.name,
                                    }),
                                  );
                                  e.dataTransfer.effectAllowed = 'move';
                                }}
                                className="flex items-center justify-between p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 cursor-grab active:cursor-grabbing group transition-all"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-sm"
                                    style={{ backgroundColor: teamColor }}
                                  >
                                    {player.shirtNo || '—'}
                                  </span>
                                  <span className="font-medium truncate text-white/90">
                                    {player.name ||
                                      player.position ||
                                      `Player ${player.shirtNo}`}
                                  </span>
                                  {player.position && (
                                    <span
                                      className={`text-[9px] px-1 py-0.2 rounded border font-mono ${getPositionBadgeClass(
                                        player.position,
                                      )}`}
                                    >
                                      {player.position}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      movePlayerToPitch(
                                        activeSlideId,
                                        player.id,
                                      )
                                    }
                                    className="px-1.5 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-[10px] text-white font-medium"
                                    title="Place on pitch"
                                  >
                                    Pitch
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveSwapPlayerId((cur) =>
                                        cur === player.id ? null : player.id,
                                      )
                                    }
                                    className={`px-1.5 py-0.5 rounded flex items-center gap-0.5 text-[10px] font-medium transition-colors ${
                                      activeSwapPlayerId === player.id
                                        ? 'bg-amber-500 text-black font-semibold'
                                        : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
                                    }`}
                                    title="Swap with pitch player"
                                  >
                                    <ArrowLeftRight size={10} />
                                    <span>Swap</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removePlayer(activeSlideId, player.id)
                                    }
                                    className="p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400"
                                    title="Remove"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>

                              {/* Swap Candidate Selection Dropdown for Bench Player */}
                              {activeSwapPlayerId === player.id && (
                                <div className="p-2 rounded bg-[#1c1c1c] border border-amber-500/40 shadow-lg space-y-1.5">
                                  <div className="flex items-center justify-between text-[10px] text-white/70 font-semibold border-b border-white/10 pb-1">
                                    <span>
                                      Swap #{player.shirtNo || '—'}{' '}
                                      {player.name || 'Player'} with Pitch
                                      Player:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveSwapPlayerId(null)
                                      }
                                      className="text-white/40 hover:text-white"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                  {teamPlayers.pitch.length === 0 ? (
                                    <div className="text-[10px] text-white/40 py-1 text-center">
                                      No pitch players available to swap
                                    </div>
                                  ) : (
                                    <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                                      {teamPlayers.pitch.map((pitchPlayer) => (
                                        <button
                                          key={pitchPlayer.id}
                                          type="button"
                                          onClick={() => {
                                            swapPlayers(
                                              activeSlideId,
                                              player.id,
                                              pitchPlayer.id,
                                            );
                                            setActiveSwapPlayerId(null);
                                          }}
                                          className="flex items-center justify-between w-full px-2 py-1 rounded bg-white/5 hover:bg-amber-500/20 hover:border-amber-500/40 border border-transparent text-left text-[10px] text-white/80 hover:text-white transition-colors"
                                        >
                                          <div className="flex items-center gap-1.5 truncate">
                                            <span
                                              className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] text-white shrink-0"
                                              style={{
                                                backgroundColor: teamColor,
                                              }}
                                            >
                                              {pitchPlayer.shirtNo || '—'}
                                            </span>
                                            <span className="truncate">
                                              {pitchPlayer.name ||
                                                `Player ${pitchPlayer.shirtNo}`}
                                            </span>
                                          </div>
                                          {pitchPlayer.position && (
                                            <span
                                              className={`text-[9px] px-1 rounded border font-mono ${getPositionBadgeClass(
                                                pitchPlayer.position,
                                              )}`}
                                            >
                                              {pitchPlayer.position}
                                            </span>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
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

        {/* 4. Pitch Players List (4-Position Grouping) */}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
              On Pitch ({teamPlayers.pitch.length})
            </span>
          </div>

          {teamPlayers.pitch.length === 0 ? (
            <div className="p-3 rounded border border-dashed border-white/10 text-center text-white/30 text-[11px]">
              No players on pitch.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-0.5">
              {POSITION_GROUPS.filter(
                (grp) => grp !== 'OTHER' || pitchGroups.OTHER.length > 0,
              ).map((grp) => {
                const groupPlayers = pitchGroups[grp];
                const isOpen = openPitchSections[grp];
                return (
                  <div
                    key={`pitch-grp-${grp}`}
                    className="rounded bg-black/20 border border-white/5 overflow-hidden"
                  >
                    {/* Group Accordion Header */}
                    <button
                      type="button"
                      onClick={() =>
                        setOpenPitchSections((prev) => ({
                          ...prev,
                          [grp]: !prev[grp],
                        }))
                      }
                      className="w-full flex items-center justify-between px-2 py-1.5 bg-white/[0.03] hover:bg-white/[0.06] text-left transition-colors"
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

                    {/* Group Items */}
                    {isOpen && (
                      <div className="p-1 space-y-1">
                        {groupPlayers.length === 0 ? (
                          <div className="py-1 text-center text-[10px] text-white/20 italic">
                            No {POSITION_GROUP_LABELS[grp].toLowerCase()}
                          </div>
                        ) : (
                          groupPlayers.map((player) => (
                            <div key={player.id} className="space-y-1">
                              <div className="flex items-center justify-between p-1.5 rounded bg-white/[0.03] hover:bg-white/10 border border-white/5 group transition-all">
                                <button
                                  type="button"
                                  onClick={() => {
                                    selectObject({
                                      id: player.id,
                                      kind: 'player',
                                    });
                                    setRightPanelTab('inspector');
                                  }}
                                  className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                                >
                                  <span
                                    className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-sm"
                                    style={{ backgroundColor: teamColor }}
                                  >
                                    {player.shirtNo || '—'}
                                  </span>
                                  <span className="font-medium truncate text-white/90 group-hover:text-white">
                                    {player.name ||
                                      player.position ||
                                      `Player ${player.shirtNo}`}
                                  </span>
                                  {player.position && (
                                    <span
                                      className={`text-[9px] px-1 py-0.2 rounded border font-mono ${getPositionBadgeClass(
                                        player.position,
                                      )}`}
                                    >
                                      {player.position}
                                    </span>
                                  )}
                                </button>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      movePlayerToBench(
                                        activeSlideId,
                                        player.id,
                                      )
                                    }
                                    className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white/70 hover:text-white"
                                    title="Send to bench"
                                  >
                                    Bench
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveSwapPlayerId((cur) =>
                                        cur === player.id ? null : player.id,
                                      )
                                    }
                                    className={`px-1.5 py-0.5 rounded flex items-center gap-0.5 text-[10px] font-medium transition-colors ${
                                      activeSwapPlayerId === player.id
                                        ? 'bg-amber-500 text-black font-semibold'
                                        : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
                                    }`}
                                    title="Swap with bench player"
                                  >
                                    <ArrowLeftRight size={10} />
                                    <span>Swap</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removePlayer(activeSlideId, player.id)
                                    }
                                    className="p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400"
                                    title="Remove"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>

                              {/* Swap Candidate Selection Dropdown for Pitch Player */}
                              {activeSwapPlayerId === player.id && (
                                <div className="p-2 rounded bg-[#1c1c1c] border border-amber-500/40 shadow-lg space-y-1.5">
                                  <div className="flex items-center justify-between text-[10px] text-white/70 font-semibold border-b border-white/10 pb-1">
                                    <span>
                                      Swap #{player.shirtNo || '—'}{' '}
                                      {player.name || 'Player'} with Bench
                                      Player:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveSwapPlayerId(null)
                                      }
                                      className="text-white/40 hover:text-white"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                  {teamPlayers.bench.length === 0 ? (
                                    <div className="text-[10px] text-white/40 py-1 text-center">
                                      No substitutes available to swap
                                    </div>
                                  ) : (
                                    <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                                      {teamPlayers.bench.map((benchPlayer) => (
                                        <button
                                          key={benchPlayer.id}
                                          type="button"
                                          onClick={() => {
                                            swapPlayers(
                                              activeSlideId,
                                              player.id,
                                              benchPlayer.id,
                                            );
                                            setActiveSwapPlayerId(null);
                                          }}
                                          className="flex items-center justify-between w-full px-2 py-1 rounded bg-white/5 hover:bg-amber-500/20 hover:border-amber-500/40 border border-transparent text-left text-[10px] text-white/80 hover:text-white transition-colors"
                                        >
                                          <div className="flex items-center gap-1.5 truncate">
                                            <span
                                              className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] text-white shrink-0"
                                              style={{
                                                backgroundColor: teamColor,
                                              }}
                                            >
                                              {benchPlayer.shirtNo || '—'}
                                            </span>
                                            <span className="truncate">
                                              {benchPlayer.name ||
                                                `Player ${benchPlayer.shirtNo}`}
                                            </span>
                                          </div>
                                          {benchPlayer.position && (
                                            <span
                                              className={`text-[9px] px-1 rounded border font-mono ${getPositionBadgeClass(
                                                benchPlayer.position,
                                              )}`}
                                            >
                                              {benchPlayer.position}
                                            </span>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
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
