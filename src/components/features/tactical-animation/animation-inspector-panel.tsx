'use client';

import {
  ArrowDownToLine,
  ArrowUpToLine,
  CheckCircle2,
  ChevronRight,
  CornerUpLeft,
  CornerUpRight,
  EyeOff,
  Hash,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  Loader2,
  MoveRight,
  Palette,
  Route,
  Settings2,
  Slash,
  Sparkles,
  Square,
  Trash2,
  Type,
  Upload,
  User,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useMemo, useRef, useState } from 'react';
import { deletePlayerPhoto, savePlayerPhoto } from '@/lib/db/queries';
import { resizeAndCropImageToBlob } from '@/lib/tactical/image-utils';
import {
  getLastName,
  normalizePosition,
  sortPlayersBy2DPositionGroup,
} from '@/lib/tactical/player-formatting';
import type { TrajectoryType } from '@/lib/tactical/trajectory';
import {
  type MarkerOptions,
  useTacticalAnimationStore,
} from '@/stores/tactical-animation-store';
import { FormationSelectPanel } from './formation-select-panel';
import { MarkerSizeControl } from './marker-size-control';

const PRESET_COLORS = [
  '#034694', // Chelsea Royal Blue
  '#3b82f6', // Light Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#ffffff', // White
  '#1e293b', // Slate Dark
  '#e2e8f0', // Slate Light
];

const PRESET_STROKE_COLORS = [
  '#ffffff', // White
  '#0f172a', // Black / Navy
  '#fbbf24', // Gold / Amber
  '#94a3b8', // Silver / Slate
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#f97316', // Orange
  '#eab308', // Yellow
];

interface AnimationInspectorPanelProps {
  onClose?: () => void;
}

export const AnimationInspectorPanel: React.FC<
  AnimationInspectorPanelProps
> = ({ onClose }) => {
  const selectedPlayerId = useTacticalAnimationStore((s) => s.selectedPlayerId);
  const selectedPlayerIds = useTacticalAnimationStore(
    (s) => s.selectedPlayerIds,
  );
  const setSelectedPlayerId = useTacticalAnimationStore(
    (s) => s.setSelectedPlayerId,
  );
  const selectAllPlayers = useTacticalAnimationStore((s) => s.selectAllPlayers);
  const clearSelection = useTacticalAnimationStore((s) => s.clearSelection);
  const activeSceneIndex = useTacticalAnimationStore((s) => s.activeSceneIndex);
  const scenes = useTacticalAnimationStore((s) => s.scenes);
  const movePlayerArea = useTacticalAnimationStore((s) => s.movePlayerArea);
  const benchTeam = useTacticalAnimationStore((s) => s.benchTeam);
  const setBenchTeam = useTacticalAnimationStore((s) => s.setBenchTeam);
  const toggleSelectPlayerId = useTacticalAnimationStore(
    (s) => s.toggleSelectPlayerId,
  );

  const defaultHomeOptions = useTacticalAnimationStore(
    (s) => s.defaultHomeOptions,
  );
  const defaultAwayOptions = useTacticalAnimationStore(
    (s) => s.defaultAwayOptions,
  );
  const updatePlayerOptions = useTacticalAnimationStore(
    (s) => s.updatePlayerOptions,
  );
  const updateMultiplePlayersOptions = useTacticalAnimationStore(
    (s) => s.updateMultiplePlayersOptions,
  );
  const updateAllPlayersOptions = useTacticalAnimationStore(
    (s) => s.updateAllPlayersOptions,
  );
  const updatePlayerTrajectory = useTacticalAnimationStore(
    (s) => s.updatePlayerTrajectory,
  );
  const updateTeamOptions = useTacticalAnimationStore(
    (s) => s.updateTeamOptions,
  );

  // メインタブ: マーカー設定 or ベンチ・フォーメーション
  const [mainTab, setMainTab] = useState<'marker' | 'bench'>('marker');

  // マーカー設定内のサブタブ: 選択選手 / HOME / AWAY / 全体
  const [markerSubTab, setMarkerSubTab] = useState<
    'player' | 'home' | 'away' | 'global'
  >('player');

  // ベンチタブ内のフォーメーション展開トグル
  const [showFormationInBench, setShowFormationInBench] = useState(true);

  const [photoInput, setPhotoInput] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeScene = scenes[activeSceneIndex];
  const allPlayers = activeScene ? Object.values(activeScene.players) : [];

  const selectedPlayer =
    selectedPlayerId && selectedPlayerId !== 'ball'
      ? activeScene?.players[selectedPlayerId]
      : null;

  const effectiveSelectedIds =
    selectedPlayerIds.length > 0
      ? selectedPlayerIds
      : selectedPlayerId && selectedPlayerId !== 'ball'
        ? [selectedPlayerId]
        : [];

  const hasSelection = effectiveSelectedIds.length > 0;

  // 選択された選手があれば自動でplayerサブタブへ
  const currentSubTab = hasSelection
    ? 'player'
    : markerSubTab === 'player'
      ? 'home'
      : markerSubTab;

  // ベンチ選手とピッチ選手の計算
  const teamPlayers = allPlayers.filter((p) => p.team === benchTeam);
  const benchPlayers = teamPlayers.filter((p) => p.area === 'bench');
  const pitchPlayers = teamPlayers.filter((p) => p.area === 'pitch');
  const allBenchPlayers = allPlayers.filter((p) => p.area === 'bench');

  // ベンチ選手をポジション順 (GK -> DF -> MF -> FW) にソートし、ポジション別グループを作成
  const sortedBenchPlayers = useMemo(() => {
    return sortPlayersBy2DPositionGroup(benchPlayers);
  }, [benchPlayers]);

  const benchGroups = useMemo(() => {
    const groups: {
      key: 'GK' | 'DF' | 'MID' | 'FW' | 'Other';
      label: string;
      badgeColor: string;
      headerColor: string;
      players: typeof benchPlayers;
    }[] = [
      {
        key: 'GK',
        label: 'GK (ゴールキーパー)',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
        headerColor: 'text-emerald-400',
        players: [],
      },
      {
        key: 'DF',
        label: 'DF (ディフェンダー)',
        badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
        headerColor: 'text-blue-400',
        players: [],
      },
      {
        key: 'MID',
        label: 'MF (ミッドフィールダー)',
        badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        headerColor: 'text-amber-400',
        players: [],
      },
      {
        key: 'FW',
        label: 'FW (フォワード)',
        badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
        headerColor: 'text-rose-400',
        players: [],
      },
    ];

    const otherPlayers: typeof benchPlayers = [];

    sortedBenchPlayers.forEach((p) => {
      const norm = normalizePosition(p.position);
      const target = groups.find((g) => g.key === norm);
      if (target) {
        target.players.push(p);
      } else {
        otherPlayers.push(p);
      }
    });

    if (otherPlayers.length > 0) {
      groups.push({
        key: 'Other',
        label: 'その他 (Other)',
        badgeColor: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
        headerColor: 'text-slate-400',
        players: otherPlayers,
      });
    }

    return groups.filter((g) => g.players.length > 0);
  }, [sortedBenchPlayers]);

  const handleColorChange = (color: string) => {
    if (currentSubTab === 'player' && effectiveSelectedIds.length > 0) {
      updateMultiplePlayersOptions(effectiveSelectedIds, { color });
    } else if (currentSubTab === 'home') {
      updateTeamOptions('home', { color });
    } else if (currentSubTab === 'away') {
      updateTeamOptions('away', { color });
    } else if (currentSubTab === 'global') {
      updateAllPlayersOptions({ color });
    }
  };

  const handleSizeChange = (sizeScale: number) => {
    if (currentSubTab === 'player' && effectiveSelectedIds.length > 0) {
      updateMultiplePlayersOptions(effectiveSelectedIds, { sizeScale });
    } else if (currentSubTab === 'home') {
      updateTeamOptions('home', { sizeScale });
    } else if (currentSubTab === 'away') {
      updateTeamOptions('away', { sizeScale });
    } else if (currentSubTab === 'global') {
      updateAllPlayersOptions({ sizeScale });
    }
  };

  const handleStrokeWidthChange = (strokeWidth: number) => {
    const patch: Partial<MarkerOptions> = { strokeWidth };
    if (strokeWidth === 0) {
      patch.strokeColor = 'none';
    } else if (
      !currentOptions.strokeColor ||
      currentOptions.strokeColor === 'none'
    ) {
      patch.strokeColor = '#ffffff';
    }
    if (currentSubTab === 'player' && effectiveSelectedIds.length > 0) {
      updateMultiplePlayersOptions(effectiveSelectedIds, patch);
    } else if (currentSubTab === 'home') {
      updateTeamOptions('home', patch);
    } else if (currentSubTab === 'away') {
      updateTeamOptions('away', patch);
    } else if (currentSubTab === 'global') {
      updateAllPlayersOptions(patch);
    }
  };

  const handleStrokeColorChange = (strokeColor: string) => {
    const patch: Partial<MarkerOptions> = { strokeColor };
    if (currentOptions.strokeWidth === 0) {
      patch.strokeWidth = 2;
    }
    if (currentSubTab === 'player' && effectiveSelectedIds.length > 0) {
      updateMultiplePlayersOptions(effectiveSelectedIds, patch);
    } else if (currentSubTab === 'home') {
      updateTeamOptions('home', patch);
    } else if (currentSubTab === 'away') {
      updateTeamOptions('away', patch);
    } else if (currentSubTab === 'global') {
      updateAllPlayersOptions(patch);
    }
  };

  const handleInsideContentChange = (
    insideContent: MarkerOptions['insideContent'],
  ) => {
    if (currentSubTab === 'player' && effectiveSelectedIds.length > 0) {
      updateMultiplePlayersOptions(effectiveSelectedIds, { insideContent });
    } else if (currentSubTab === 'home') {
      updateTeamOptions('home', { insideContent });
    } else if (currentSubTab === 'away') {
      updateTeamOptions('away', { insideContent });
    } else if (currentSubTab === 'global') {
      updateAllPlayersOptions({ insideContent });
    }
  };

  const handleBottomLabelChange = (
    bottomLabel: MarkerOptions['bottomLabel'],
  ) => {
    if (currentSubTab === 'player' && effectiveSelectedIds.length > 0) {
      updateMultiplePlayersOptions(effectiveSelectedIds, { bottomLabel });
    } else if (currentSubTab === 'home') {
      updateTeamOptions('home', { bottomLabel });
    } else if (currentSubTab === 'away') {
      updateTeamOptions('away', { bottomLabel });
    } else if (currentSubTab === 'global') {
      updateAllPlayersOptions({ bottomLabel });
    }
  };

  const handleNumberSizeChange = (numberSizeScale: number) => {
    if (currentSubTab === 'player' && effectiveSelectedIds.length > 0) {
      updateMultiplePlayersOptions(effectiveSelectedIds, { numberSizeScale });
    } else if (currentSubTab === 'home') {
      updateTeamOptions('home', { numberSizeScale });
    } else if (currentSubTab === 'away') {
      updateTeamOptions('away', { numberSizeScale });
    } else if (currentSubTab === 'global') {
      updateAllPlayersOptions({ numberSizeScale });
    }
  };

  const handleLabelSizeChange = (labelSizeScale: number) => {
    if (currentSubTab === 'player' && effectiveSelectedIds.length > 0) {
      updateMultiplePlayersOptions(effectiveSelectedIds, { labelSizeScale });
    } else if (currentSubTab === 'home') {
      updateTeamOptions('home', { labelSizeScale });
    } else if (currentSubTab === 'away') {
      updateTeamOptions('away', { labelSizeScale });
    } else if (currentSubTab === 'global') {
      updateAllPlayersOptions({ labelSizeScale });
    }
  };

  const handleTrajectoryTypeChange = (type: TrajectoryType) => {
    if (effectiveSelectedIds.length > 0) {
      effectiveSelectedIds.forEach((id) => {
        updatePlayerTrajectory(id, { type });
      });
    }
  };

  const handleCurveOffsetChange = (curveOffset: number) => {
    if (effectiveSelectedIds.length > 0) {
      effectiveSelectedIds.forEach((id) => {
        updatePlayerTrajectory(id, { curveOffset });
      });
    }
  };

  const processAndSaveFile = async (file: File | Blob) => {
    if (!selectedPlayer) return;
    setIsProcessingPhoto(true);
    try {
      const blob = await resizeAndCropImageToBlob(file, 256, 'image/png');
      const numId = Number(selectedPlayer.playerId);
      if (!Number.isNaN(numId)) {
        await savePlayerPhoto(numId, blob, selectedPlayer.name);
      }
      const objectUrl = URL.createObjectURL(blob);
      updatePlayerOptions(
        selectedPlayer.playerId,
        {
          photoUrl: objectUrl,
          insideContent: 'photo',
        },
        true,
      );
      setPhotoInput('');
    } catch (err) {
      console.error('[animation-inspector-panel] Failed to upload photo:', err);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processAndSaveFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processAndSaveFile(files[0]);
    }
    e.target.value = '';
  };

  const handleDeletePhoto = async () => {
    if (!selectedPlayer) return;
    const numId = Number(selectedPlayer.playerId);
    if (!Number.isNaN(numId)) {
      await deletePlayerPhoto(numId);
    }
    updatePlayerOptions(
      selectedPlayer.playerId,
      {
        photoUrl: undefined,
        insideContent: 'number',
      },
      true,
    );
    setPhotoInput('');
  };

  const handleSavePhotoUrl = async () => {
    if (!photoInput.trim() || !selectedPlayer) return;
    const url = photoInput.trim();
    setIsProcessingPhoto(true);
    try {
      const numId = Number(selectedPlayer.playerId);
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (res.ok) {
          const rawBlob = await res.blob();
          const croppedBlob = await resizeAndCropImageToBlob(
            rawBlob,
            256,
            'image/png',
          );
          if (!Number.isNaN(numId)) {
            await savePlayerPhoto(numId, croppedBlob, selectedPlayer.name);
          }
          const objectUrl = URL.createObjectURL(croppedBlob);
          updatePlayerOptions(
            selectedPlayer.playerId,
            {
              photoUrl: objectUrl,
              insideContent: 'photo',
            },
            true,
          );
          setPhotoInput('');
          return;
        }
      } catch {
        // Direct URL fallback
      }

      updatePlayerOptions(
        selectedPlayer.playerId,
        {
          photoUrl: url,
          insideContent: 'photo',
        },
        true,
      );
      setPhotoInput('');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleBenchSelected = () => {
    if (effectiveSelectedIds.length > 0) {
      effectiveSelectedIds.forEach((id) => {
        movePlayerArea(activeSceneIndex, id, 'bench');
      });
      clearSelection();
    }
  };

  const handlePutOnPitch = (playerId: string) => {
    const offsetX = 40 + Math.random() * 20;
    const offsetY = 40 + Math.random() * 20;
    movePlayerArea(activeSceneIndex, playerId, 'pitch', {
      x: offsetX,
      y: offsetY,
    });
    setSelectedPlayerId(playerId);
  };

  const firstSelectedPlayer =
    effectiveSelectedIds.length > 0
      ? activeScene?.players[effectiveSelectedIds[0]]
      : null;

  const currentOptions: MarkerOptions =
    currentSubTab === 'player' && (selectedPlayer || firstSelectedPlayer)
      ? (selectedPlayer || firstSelectedPlayer)!.options
      : currentSubTab === 'home'
        ? defaultHomeOptions
        : currentSubTab === 'away'
          ? defaultAwayOptions
          : defaultHomeOptions;

  const currentTrajectory = selectedPlayer?.trajectory || {
    type: 'straight',
    curveOffset: 25,
  };

  return (
    <div className="flex flex-col w-72 sm:w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 text-white h-full overflow-hidden select-none shrink-0 z-10">
      {/* パネルヘッダー */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-950 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-200">
          <Settings2 className="w-4 h-4 text-blue-400" />
          <span>インスペクター</span>
        </div>

        <div className="flex items-center gap-1.5">
          {hasSelection && (
            <button
              type="button"
              onClick={clearSelection}
              className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
              title="選択解除"
            >
              解除
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="インスペクターを閉じる"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* メインタブ (マーカー設定 / ベンチ・配置) */}
      <div className="flex p-1 bg-slate-950/80 border-b border-slate-800 shrink-0 gap-1">
        <button
          type="button"
          onClick={() => setMainTab('marker')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
            mainTab === 'marker'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>マーカー・軌道</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('bench')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
            mainTab === 'bench'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>控え・配置</span>
          {allBenchPlayers.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                mainTab === 'bench'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {allBenchPlayers.length}
            </span>
          )}
        </button>
      </div>

      {/* タブコンテンツ */}
      <div className="flex-1 overflow-y-auto p-3 text-xs space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
        {mainTab === 'marker' ? (
          <>
            {/* サブタブ (選択選手 / HOME / AWAY / 全体) */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800/80 shrink-0">
              {hasSelection && (
                <button
                  type="button"
                  onClick={() => setMarkerSubTab('player')}
                  className={`flex-1 py-1 px-1.5 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1 text-[11px] ${
                    currentSubTab === 'player'
                      ? 'bg-blue-600 text-white shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {effectiveSelectedIds.length > 1 ? (
                    <Users className="w-3 h-3" />
                  ) : (
                    <User className="w-3 h-3" />
                  )}
                  <span>
                    {effectiveSelectedIds.length > 1
                      ? `${effectiveSelectedIds.length}名`
                      : '選択選手'}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setMarkerSubTab('home')}
                className={`flex-1 py-1 px-1.5 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1 text-[11px] ${
                  currentSubTab === 'home'
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>HOME</span>
              </button>
              <button
                type="button"
                onClick={() => setMarkerSubTab('away')}
                className={`flex-1 py-1 px-1.5 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1 text-[11px] ${
                  currentSubTab === 'away'
                    ? 'bg-red-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>AWAY</span>
              </button>
              <button
                type="button"
                onClick={() => setMarkerSubTab('global')}
                className={`flex-1 py-1 px-1.5 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1 text-[11px] ${
                  currentSubTab === 'global'
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>全体</span>
              </button>
            </div>

            {/* 選択選手サマリーカード */}
            {currentSubTab === 'player' && hasSelection && (
              <div className="flex items-center gap-2.5 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800">
                {selectedPlayer && effectiveSelectedIds.length === 1 ? (
                  <>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow border border-white/20 shrink-0 text-xs"
                      style={{ backgroundColor: selectedPlayer.options.color }}
                    >
                      {selectedPlayer.shirtNo || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-100 truncate text-xs">
                        {selectedPlayer.name} (
                        {getLastName(selectedPlayer.name)})
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <span className="uppercase font-semibold">
                          {selectedPlayer.team}
                        </span>
                        <span>•</span>
                        <span className="capitalize">
                          {selectedPlayer.area}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-100 text-xs">
                        {effectiveSelectedIds.length} 名を一括選択中
                      </div>
                      <div className="text-[10px] text-slate-400">
                        一括で色・サイズ・軌道等を変更
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleBenchSelected}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors shrink-0"
                  title="選択選手をベンチへ送る"
                >
                  <ArrowDownToLine className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            )}

            {/* 全体・チームクイック選択ボタン */}
            {(currentSubTab === 'home' ||
              currentSubTab === 'away' ||
              currentSubTab === 'global') && (
              <div className="flex items-center gap-1.5 p-1.5 bg-slate-950/60 rounded-lg border border-slate-800">
                {currentSubTab === 'home' && (
                  <button
                    type="button"
                    onClick={() => selectAllPlayers('home')}
                    className="flex-1 py-1 px-2 bg-slate-800 hover:bg-blue-600/80 text-slate-200 hover:text-white rounded text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <Users className="w-3 h-3" />
                    <span>HOME全選手を選択</span>
                  </button>
                )}
                {currentSubTab === 'away' && (
                  <button
                    type="button"
                    onClick={() => selectAllPlayers('away')}
                    className="flex-1 py-1 px-2 bg-slate-800 hover:bg-red-600/80 text-slate-200 hover:text-white rounded text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <Users className="w-3 h-3" />
                    <span>AWAY全選手を選択</span>
                  </button>
                )}
                {currentSubTab === 'global' && (
                  <>
                    <button
                      type="button"
                      onClick={() => selectAllPlayers()}
                      className="flex-1 py-1 px-2 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      <Users className="w-3 h-3" />
                      <span>全選手を選択</span>
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold transition-colors"
                    >
                      解除
                    </button>
                  </>
                )}
              </div>
            )}

            {/* 移動軌道 (回り込み・カーブ設定) - 選択選手タブのみ */}
            {currentSubTab === 'player' && hasSelection && (
              <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-2">
                  <Route className="w-3.5 h-3.5 text-indigo-400" />
                  <span>移動軌道 (カーブ設定)</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => handleTrajectoryTypeChange('straight')}
                    className={`py-1.5 rounded flex flex-col items-center gap-1 transition-colors ${
                      currentTrajectory.type === 'straight'
                        ? 'bg-indigo-600 text-white font-semibold shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                    title="直線的に最短距離で移動"
                  >
                    <MoveRight className="w-3.5 h-3.5" />
                    <span className="text-[10px]">直線</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTrajectoryTypeChange('arc_right')}
                    className={`py-1.5 rounded flex flex-col items-center gap-1 transition-colors ${
                      currentTrajectory.type === 'arc_right'
                        ? 'bg-indigo-600 text-white font-semibold shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                    title="外側 (進行方向から見て右側) に膨らんで回り込む"
                  >
                    <CornerUpRight className="w-3.5 h-3.5" />
                    <span className="text-[10px]">右カーブ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTrajectoryTypeChange('arc_left')}
                    className={`py-1.5 rounded flex flex-col items-center gap-1 transition-colors ${
                      currentTrajectory.type === 'arc_left'
                        ? 'bg-indigo-600 text-white font-semibold shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                    title="内側 (進行方向から見て左側) に膨らんで回り込む"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                    <span className="text-[10px]">左カーブ</span>
                  </button>
                </div>

                {currentTrajectory.type !== 'straight' && (
                  <div className="flex flex-col gap-1 pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>カーブ強度 (膨らみ量):</span>
                      <span className="font-mono text-white">
                        {currentTrajectory.curveOffset ?? 25}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={60}
                      step={5}
                      value={currentTrajectory.curveOffset ?? 25}
                      onChange={(e) =>
                        handleCurveOffsetChange(Number(e.target.value))
                      }
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* マーカーサイズ調整 */}
            <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
              <MarkerSizeControl
                value={currentOptions.sizeScale ?? 1.0}
                onChange={handleSizeChange}
                title={
                  currentSubTab === 'player'
                    ? effectiveSelectedIds.length > 1
                      ? '選択選手サイズ'
                      : '選手マーカーサイズ'
                    : currentSubTab === 'home'
                      ? 'HOMEマーカーサイズ'
                      : currentSubTab === 'away'
                        ? 'AWAYマーカーサイズ'
                        : '全マーカーサイズ一括'
                }
              />
            </div>

            {/* カラー設定 */}
            <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-2">
                <Palette className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {currentSubTab === 'player'
                    ? 'マーカーカラー'
                    : currentSubTab === 'home'
                      ? 'HOMEチームカラー'
                      : currentSubTab === 'away'
                        ? 'AWAYチームカラー'
                        : '全体カラー一括'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => handleColorChange(c)}
                    className={`w-full aspect-square rounded-lg border transition-all ${
                      currentOptions.color === c
                        ? 'border-white ring-2 ring-blue-500 scale-105'
                        : 'border-slate-700 hover:border-slate-500'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentOptions.color}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={currentOptions.color}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 font-mono"
                />
              </div>
            </div>

            {/* 枠線設定 (Stroke / Border) */}
            <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {currentSubTab === 'player'
                      ? 'マーカー枠線 (縁取り)'
                      : currentSubTab === 'home'
                        ? 'HOME枠線 (縁取り)'
                        : currentSubTab === 'away'
                          ? 'AWAY枠線 (縁取り)'
                          : '全体枠線一括'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {currentOptions.strokeWidth === 0 ||
                  currentOptions.strokeColor === 'none'
                    ? '枠線なし'
                    : `太さ: ${currentOptions.strokeWidth ?? 2}`}
                </span>
              </div>

              {/* 太さ / 枠線の有無ボタングループ */}
              <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 mb-2.5">
                <button
                  type="button"
                  onClick={() => handleStrokeWidthChange(0)}
                  className={`py-1.5 rounded flex flex-col items-center gap-0.5 transition-colors ${
                    !currentOptions.strokeWidth ||
                    currentOptions.strokeWidth === 0 ||
                    currentOptions.strokeColor === 'none'
                      ? 'bg-blue-600 text-white font-semibold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="枠線を非表示（なし）にする"
                >
                  <Slash className="w-3.5 h-3.5" />
                  <span className="text-[9px]">なし</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStrokeWidthChange(1)}
                  className={`py-1.5 rounded flex flex-col items-center gap-0.5 transition-colors ${
                    currentOptions.strokeWidth === 1 &&
                    currentOptions.strokeColor !== 'none'
                      ? 'bg-blue-600 text-white font-semibold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="細い枠線"
                >
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                  <span className="text-[9px]">細め</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStrokeWidthChange(2)}
                  className={`py-1.5 rounded flex flex-col items-center gap-0.5 transition-colors ${
                    currentOptions.strokeWidth === 2 &&
                    currentOptions.strokeColor !== 'none'
                      ? 'bg-blue-600 text-white font-semibold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="標準の枠線"
                >
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                  <span className="text-[9px]">標準</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStrokeWidthChange(3.5)}
                  className={`py-1.5 rounded flex flex-col items-center gap-0.5 transition-colors ${
                    currentOptions.strokeWidth === 3.5 &&
                    currentOptions.strokeColor !== 'none'
                      ? 'bg-blue-600 text-white font-semibold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="太い枠線"
                >
                  <div className="w-3.5 h-3.5 rounded-full border-[3px] border-slate-300" />
                  <span className="text-[9px]">太め</span>
                </button>
              </div>

              {/* 枠線カラー選択 (枠線が有効な場合のみ展開) */}
              {currentOptions.strokeWidth !== 0 &&
                currentOptions.strokeColor !== 'none' && (
                  <div>
                    <div className="text-[10px] text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>枠線の色</span>
                      <span className="font-mono text-slate-300">
                        {currentOptions.strokeColor ?? '#ffffff'}
                      </span>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5 mb-2">
                      {PRESET_STROKE_COLORS.map((c) => (
                        <button
                          type="button"
                          key={c}
                          onClick={() => handleStrokeColorChange(c)}
                          className={`w-full aspect-square rounded-md border transition-all ${
                            (currentOptions.strokeColor ?? '#ffffff') === c
                              ? 'border-white ring-2 ring-blue-500 scale-105'
                              : 'border-slate-700 hover:border-slate-500'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={currentOptions.strokeColor ?? '#ffffff'}
                        onChange={(e) => handleStrokeColorChange(e.target.value)}
                        className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={currentOptions.strokeColor ?? '#ffffff'}
                        onChange={(e) => handleStrokeColorChange(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 font-mono"
                      />
                    </div>
                  </div>
                )}
            </div>

            {/* マーカー内部表示 */}
            <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                <span>内部表示</span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleInsideContentChange('number')}
                  className={`py-1.5 rounded flex flex-col items-center gap-1 transition-colors ${
                    currentOptions.insideContent === 'number'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span className="text-[10px]">背番号</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsideContentChange('photo')}
                  className={`py-1.5 rounded flex flex-col items-center gap-1 transition-colors ${
                    currentOptions.insideContent === 'photo'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span className="text-[10px]">顔写真</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsideContentChange('none')}
                  className={`py-1.5 rounded flex flex-col items-center gap-1 transition-colors ${
                    currentOptions.insideContent === 'none'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span className="text-[10px]">なし</span>
                </button>
              </div>

              {/* 背番号サイズ調整 (背番号表示時のみ) */}
              {currentOptions.insideContent === 'number' && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-400 font-medium">
                      背番号の大きさ
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-blue-400">
                      {Math.round((currentOptions.numberSizeScale ?? 1.0) * 100)}%
                    </span>
                  </div>

                  {/* プリセットボタン */}
                  <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 mb-2">
                    {[
                      { label: '小', val: 0.8 },
                      { label: '標準', val: 1.0 },
                      { label: '大', val: 1.2 },
                      { label: '特大', val: 1.4 },
                    ].map((p) => {
                      const isSel =
                        Math.abs(
                          (currentOptions.numberSizeScale ?? 1.0) - p.val,
                        ) < 0.05;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleNumberSizeChange(p.val)}
                          className={`py-0.5 rounded text-center text-[10px] font-medium transition-colors ${
                            isSel
                              ? 'bg-blue-600 text-white font-bold shadow'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="range"
                    min={0.6}
                    max={1.6}
                    step={0.05}
                    value={currentOptions.numberSizeScale ?? 1.0}
                    onChange={(e) =>
                      handleNumberSizeChange(Number(e.target.value))
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              )}

              {/* 写真アップロード & URL設定 (単一選択時のみ) */}
              {currentSubTab === 'player' &&
                selectedPlayer &&
                effectiveSelectedIds.length === 1 &&
                currentOptions.insideContent === 'photo' && (
                  <div className="mt-2.5 flex flex-col gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                    {selectedPlayer.options.photoUrl ? (
                      <div className="flex items-center gap-2 p-1.5 bg-slate-950 rounded-md border border-slate-800">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-blue-500 shrink-0 bg-slate-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedPlayer.options.photoUrl}
                            alt={selectedPlayer.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-slate-200 truncate">
                            {selectedPlayer.name}
                          </div>
                          <div className="text-[9px] text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>IndexedDB保存済</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleDeletePhoto}
                          disabled={isProcessingPhoto}
                          className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                          title="写真を削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : null}

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(true);
                      }}
                      onDragLeave={() => setIsDraggingFile(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center p-2.5 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                        isDraggingFile
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-700 hover:border-slate-500 bg-slate-950/50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      {isProcessingPhoto ? (
                        <div className="flex items-center gap-1.5 text-blue-400 py-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-[10px] font-medium">
                            処理中...
                          </span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-slate-400 mb-0.5" />
                          <span className="text-[10px] font-medium text-slate-200">
                            画像ドロップ / 選択
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 pt-1 border-t border-slate-800">
                      <div className="flex items-center gap-1 text-[9px] text-slate-400">
                        <Link2 className="w-2.5 h-2.5" />
                        <span>URL入力:</span>
                      </div>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="https://..."
                          value={photoInput}
                          onChange={(e) => setPhotoInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSavePhotoUrl();
                          }}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleSavePhotoUrl}
                          disabled={isProcessingPhoto || !photoInput.trim()}
                          className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-[10px] text-white transition-colors shrink-0"
                        >
                          適用
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </div>

            {/* 下部ラベル */}
            <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-2">
                <Type className="w-3.5 h-3.5 text-slate-400" />
                <span>下部ラベル</span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleBottomLabelChange('name')}
                  className={`py-1.5 rounded flex flex-col items-center gap-1 transition-colors ${
                    currentOptions.bottomLabel === 'name'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="text-[10px]">姓(LastName)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBottomLabelChange('number')}
                  className={`py-1.5 rounded flex flex-col items-center gap-1 transition-colors ${
                    currentOptions.bottomLabel === 'number'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span className="text-[10px]">背番号</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBottomLabelChange('none')}
                  className={`py-1.5 rounded flex flex-col items-center gap-1 transition-colors ${
                    currentOptions.bottomLabel === 'none'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span className="text-[10px]">なし</span>
                </button>
              </div>

              {/* ラベルサイズ調整 (ラベル表示時のみ) */}
              {currentOptions.bottomLabel !== 'none' && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-400 font-medium">
                      ラベル文字の大きさ
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-blue-400">
                      {Math.round((currentOptions.labelSizeScale ?? 1.0) * 100)}%
                    </span>
                  </div>

                  {/* プリセットボタン */}
                  <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 mb-2">
                    {[
                      { label: '小', val: 0.8 },
                      { label: '標準', val: 1.0 },
                      { label: '大', val: 1.2 },
                      { label: '特大', val: 1.4 },
                    ].map((p) => {
                      const isSel =
                        Math.abs(
                          (currentOptions.labelSizeScale ?? 1.0) - p.val,
                        ) < 0.05;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleLabelSizeChange(p.val)}
                          className={`py-0.5 rounded text-center text-[10px] font-medium transition-colors ${
                            isSel
                              ? 'bg-blue-600 text-white font-bold shadow'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="range"
                    min={0.6}
                    max={1.6}
                    step={0.05}
                    value={currentOptions.labelSizeScale ?? 1.0}
                    onChange={(e) =>
                      handleLabelSizeChange(Number(e.target.value))
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          /* ベンチ & フォーメーション タブ */
          <>
            {/* チーム切り替え */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setBenchTeam('home')}
                className={`flex-1 py-1.5 px-2 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                  benchTeam === 'home'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span>HOME ({pitchPlayers.length}/11)</span>
              </button>
              <button
                type="button"
                onClick={() => setBenchTeam('away')}
                className={`flex-1 py-1.5 px-2 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                  benchTeam === 'away'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span>
                  AWAY (
                  {
                    allPlayers.filter(
                      (p) => p.team === 'away' && p.area === 'pitch',
                    ).length
                  }
                  /11)
                </span>
              </button>
            </div>

            {/* フォーメーション一括配置パネル */}
            <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />
                  <span>フォーメーション配置</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFormationInBench(!showFormationInBench)}
                  className="text-[10px] text-slate-400 hover:text-slate-200"
                >
                  {showFormationInBench ? '閉じる' : '展開'}
                </button>
              </div>

              {showFormationInBench && (
                <FormationSelectPanel defaultTeam={benchTeam} />
              )}
            </div>

            {/* ベンチ選手リスト (ポジション別配置) */}
            <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/80">
                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    控え選手 (
                    <span className="text-white font-mono">
                      {benchPlayers.length}
                    </span>
                    名)
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  ポジション別配置
                </span>
              </div>

              {benchGroups.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  控え選手はいません
                  <div className="text-[10px] text-slate-600 mt-1">
                    全選手がピッチ上に配置されています
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {benchGroups.map((group) => (
                    <div key={group.key} className="space-y-1.5">
                      {/* ポジションヘッダー */}
                      <div className="flex items-center justify-between px-1 text-[11px] font-bold">
                        <div className={`flex items-center gap-1.5 ${group.headerColor}`}>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono border font-bold ${group.badgeColor}`}
                          >
                            {group.key === 'MID' ? 'MF' : group.key}
                          </span>
                          <span>{group.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {group.players.length}名
                        </span>
                      </div>

                      {/* 選手リスト */}
                      <div className="space-y-1">
                        {group.players.map((player) => {
                          const isSelected =
                            selectedPlayerIds.includes(player.playerId) ||
                            selectedPlayerId === player.playerId;
                          const posName = player.position || (group.key === 'MID' ? 'MF' : group.key);

                          return (
                            <div
                              key={player.playerId}
                              onClick={(e) => {
                                if (e.shiftKey) {
                                  toggleSelectPlayerId(player.playerId, true);
                                } else {
                                  setSelectedPlayerId(player.playerId);
                                }
                              }}
                              className={`flex items-center justify-between p-1.5 px-2 rounded-lg border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-500'
                                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-sm"
                                  style={{
                                    backgroundColor: player.options.color,
                                  }}
                                >
                                  {player.shirtNo || '-'}
                                </div>
                                <span
                                  className={`px-1 py-0.2 rounded text-[9px] font-mono border font-semibold ${group.badgeColor}`}
                                >
                                  {posName}
                                </span>
                                <div className="truncate text-xs font-medium text-slate-200">
                                  {getLastName(player.name)}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePutOnPitch(player.playerId);
                                }}
                                className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-emerald-600/80 text-slate-300 hover:text-white rounded text-[10px] font-semibold transition-colors ml-1 shrink-0"
                                title="ピッチへ投入"
                              >
                                <ArrowUpToLine className="w-3 h-3 text-emerald-400" />
                                <span>投入</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
