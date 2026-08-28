'use client';

/**
 * formation-sub-panel.tsx
 * Figma-like Right Panel: Formation & Sub-members management
 *
 * Features:
 *  - Home / Away team selection & color customize
 *  - Full / Half formation presets (from existing Footics formations)
 *  - Extensible season presets (e.g. 2024-25 Season squad)
 *  - Unlimited pitch players list with selection and "Send to Bench"
 *  - Bench/Sub-members list with free D&D to pitch and instant placement
 *  - Add custom sub player
 */

import {
  ChevronDown,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import {
  FORMATION_LIST,
  type FormationMode,
  type FormationType,
} from '@/lib/data/formations';
import type { SeasonFormationPreset } from '@/lib/types/tactical-unified';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';

// ── シーズンプリセット拡張サンプルデータ ──────────────────────────────────
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
  const addCustomPlayer = useTacticalUnifiedStore((s) => s.addCustomPlayer);
  const removePlayer = useTacticalUnifiedStore((s) => s.removePlayer);

  // Local states
  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');
  const [formationMode, setFormationMode] = useState<FormationMode>('half');
  const [selectedFormation, setSelectedFormation] =
    useState<FormationType>('4-3-3');
  const [formationSearch, setFormationSearch] = useState('');
  const [showSeasonPresets, setShowSeasonPresets] = useState(false);

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
          <span className="font-semibold text-white/90">
            フォーメーション & 選手
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
        {/* 1. チーム選択 (Home / Away) */}
        <div className="p-3">
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
        </div>

        {/* 2. フォーメーション展開 (Full / Half ＆ プリセット一覧 ＆ 初期化) */}
        <div className="p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
              フォーメーション
            </span>
            <div className="flex items-center gap-1.5">
              {/* フォーメーション初期化リセットボタン */}
              <button
                type="button"
                onClick={() => handleApplyFormation(selectedFormation)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-white/80 hover:text-white transition-colors"
                title="現在のフォーメーションの初期配置にリセット"
              >
                <RotateCcw size={10} className="text-amber-400" />
                <span>初期配置</span>
              </button>

              {/* Full / Half 切替 */}
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

          {/* 検索・選択 */}
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              placeholder="フォーメーション検索..."
              value={formationSearch}
              onChange={(e) => setFormationSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1 rounded bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* クイック選択チップ */}
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

          {/* シーズンプリセット (拡張性) */}
          <div>
            <button
              type="button"
              onClick={() => setShowSeasonPresets((v) => !v)}
              className="flex items-center justify-between w-full text-[11px] text-white/60 hover:text-white py-1"
            >
              <span className="flex items-center gap-1.5">
                <Shield size={12} className="text-amber-400" />
                シーズンプリセット ({SAMPLE_SEASON_PRESETS.length})
              </span>
              <ChevronDown
                size={12}
                className={`transition-transform ${showSeasonPresets ? 'rotate-180' : ''}`}
              />
            </button>

            {showSeasonPresets && (
              <div className="space-y-1 mt-1 p-1.5 bg-black/40 rounded border border-white/10">
                {SAMPLE_SEASON_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplySeasonPreset(preset)}
                    className="flex items-center justify-between w-full px-2 py-1.5 rounded bg-white/5 hover:bg-white/15 text-left text-[11px] text-white/80 hover:text-white transition-colors"
                  >
                    <span className="font-medium">{preset.name}</span>
                    <span className="text-[10px] text-white/40">
                      {preset.season}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. サブエリア (グリッド表示 ＆ D&Dでピッチと相互行き来 / マーカー自動削除) */}
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
                サブメンバー ({teamPlayers.bench.length})
              </span>
              <span className="text-[9px] text-white/40">
                (D&Dでピッチと入替)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingSub((v) => !v)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white/80 hover:text-white transition-colors"
            >
              <UserPlus size={11} />
              <span>追加</span>
            </button>
          </div>

          {/* 新規サブ追加フォーム */}
          {isAddingSub && (
            <form
              onSubmit={handleAddSub}
              className="p-2 rounded bg-black/40 border border-white/10 space-y-1.5"
            >
              <div className="grid grid-cols-3 gap-1">
                <input
                  type="text"
                  placeholder="背番号"
                  value={newSubNo}
                  onChange={(e) => setNewSubNo(e.target.value)}
                  className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs"
                />
                <input
                  type="text"
                  placeholder="ポジション"
                  value={newSubPos}
                  onChange={(e) => setNewSubPos(e.target.value)}
                  className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs"
                />
                <button
                  type="submit"
                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                >
                  登録
                </button>
              </div>
              <input
                type="text"
                placeholder="選手名 (例: 選手A)"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs"
              />
            </form>
          )}

          {/* サブメンバー グリッド表示 */}
          <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto custom-scrollbar p-1 rounded-lg border border-dashed border-white/10 bg-black/20">
            {teamPlayers.bench.map((player) => (
              <div
                key={player.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    'application/json',
                    JSON.stringify({
                      playerId: player.id,
                      type: 'bench-player',
                    }),
                  );
                }}
                onClick={() => {
                  const defaultX =
                    activeTeam === 'home'
                      ? 30 + Math.random() * 15
                      : 70 - Math.random() * 15;
                  const defaultY = 30 + Math.random() * 40;
                  movePlayerToPitch(
                    activeSlideId,
                    player.id,
                    defaultX,
                    defaultY,
                  );
                  selectObject({ id: player.id, kind: 'player' });
                  setRightPanelTab('inspector');
                }}
                className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 cursor-pointer text-white/90 transition-all select-none group relative"
                title="クリックでピッチへ配置 & プロパティ編集"
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 border border-white/20 opacity-80"
                  style={{ backgroundColor: teamColor }}
                >
                  {player.shirtNo || '•'}
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate text-[11px] font-medium leading-tight">
                    {player.name}
                  </span>
                  <span className="text-[9px] text-white/40 font-mono">
                    {player.position || 'SUB'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePlayer(activeSlideId, player.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-opacity"
                  title="削除"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}

            {teamPlayers.bench.length === 0 && (
              <div className="col-span-2 py-6 text-center text-white/40 text-xs italic">
                サブメンバーはいません（右上の「追加」から登録）
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
