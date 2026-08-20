'use client';

import {
  ArrowDownToLine,
  CheckCircle2,
  CornerUpLeft,
  CornerUpRight,
  EyeOff,
  Hash,
  Image as ImageIcon,
  Link2,
  Loader2,
  MoveRight,
  Palette,
  Route,
  Settings2,
  Sparkles,
  Trash2,
  Type,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';
import { deletePlayerPhoto, savePlayerPhoto } from '@/lib/db/queries';
import { resizeAndCropImageToBlob } from '@/lib/tactical/image-utils';
import { getLastName } from '@/lib/tactical/player-formatting';
import type { TrajectoryType } from '@/lib/tactical/trajectory';
import {
  type MarkerOptions,
  useTacticalAnimationStore,
} from '@/stores/tactical-animation-store';
import { FormationSelectPanel } from './formation-select-panel';
import { MarkerSizeControl } from './marker-size-control';

const PRESET_COLORS = [
  '#3b82f6', // Blue
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

export const MarkerOptionsPanel: React.FC = () => {
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

  const [activeTab, setActiveTab] = useState<
    'player' | 'home' | 'away' | 'global'
  >('player');
  const [photoInput, setPhotoInput] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeScene = scenes[activeSceneIndex];
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

  // 選択された選手があれば自動でplayerタブへ
  const currentTab = hasSelection
    ? 'player'
    : activeTab === 'player'
      ? 'home'
      : activeTab;

  const handleColorChange = (color: string) => {
    if (currentTab === 'player' && effectiveSelectedIds.length > 0) {
      updateMultiplePlayersOptions(effectiveSelectedIds, { color });
    } else if (currentTab === 'home') {
      updateTeamOptions('home', { color });
    } else if (currentTab === 'away') {
      updateTeamOptions('away', { color });
    } else if (currentTab === 'global') {
      updateAllPlayersOptions({ color });
    }
  };

  const handleSizeChange = (sizeScale: number) => {
    if (currentTab === 'player' && effectiveSelectedIds.length > 0) {
      updateMultiplePlayersOptions(effectiveSelectedIds, { sizeScale });
    } else if (currentTab === 'home') {
      updateTeamOptions('home', { sizeScale });
    } else if (currentTab === 'away') {
      updateTeamOptions('away', { sizeScale });
    } else if (currentTab === 'global') {
      updateAllPlayersOptions({ sizeScale });
    }
  };

  const handleInsideContentChange = (
    insideContent: MarkerOptions['insideContent'],
  ) => {
    if (currentTab === 'player' && effectiveSelectedIds.length > 0) {
      updateMultiplePlayersOptions(effectiveSelectedIds, { insideContent });
    } else if (currentTab === 'home') {
      updateTeamOptions('home', { insideContent });
    } else if (currentTab === 'away') {
      updateTeamOptions('away', { insideContent });
    } else if (currentTab === 'global') {
      updateAllPlayersOptions({ insideContent });
    }
  };

  const handleBottomLabelChange = (
    bottomLabel: MarkerOptions['bottomLabel'],
  ) => {
    if (currentTab === 'player' && effectiveSelectedIds.length > 0) {
      updateMultiplePlayersOptions(effectiveSelectedIds, { bottomLabel });
    } else if (currentTab === 'home') {
      updateTeamOptions('home', { bottomLabel });
    } else if (currentTab === 'away') {
      updateTeamOptions('away', { bottomLabel });
    } else if (currentTab === 'global') {
      updateAllPlayersOptions({ bottomLabel });
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
      console.error(
        '[marker-options-panel] Failed to upload/process photo:',
        err,
      );
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

  const currentOptions: MarkerOptions =
    currentTab === 'player' && selectedPlayer
      ? selectedPlayer.options
      : currentTab === 'home'
        ? defaultHomeOptions
        : currentTab === 'away'
          ? defaultAwayOptions
          : defaultHomeOptions;

  const currentTrajectory = selectedPlayer?.trajectory || {
    type: 'straight',
    curveOffset: 25,
  };

  return (
    <div className="flex flex-col w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 p-4 text-white overflow-y-auto text-xs sm:text-sm">
      {/* ヘッダー */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 font-bold text-slate-200">
          <Settings2 className="w-4 h-4 text-blue-400" />
          <span>マーカー・配置設定</span>
        </div>
        {hasSelection && (
          <button
            type="button"
            onClick={clearSelection}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title="選択解除"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* タブ切り替え */}
      <div className="flex bg-slate-950 p-1 rounded-lg mb-4 border border-slate-800/80 shrink-0">
        {hasSelection && (
          <button
            type="button"
            onClick={() => setActiveTab('player')}
            className={`flex-1 py-1.5 px-2 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1 text-xs ${
              currentTab === 'player'
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {effectiveSelectedIds.length > 1 ? (
              <Users className="w-3.5 h-3.5" />
            ) : (
              <User className="w-3.5 h-3.5" />
            )}
            <span>
              {effectiveSelectedIds.length > 1
                ? `${effectiveSelectedIds.length}名選択`
                : '選択選手'}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`flex-1 py-1.5 px-2 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1 text-xs ${
            currentTab === 'home'
              ? 'bg-blue-600 text-white shadow-sm font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>HOME</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('away')}
          className={`flex-1 py-1.5 px-2 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1 text-xs ${
            currentTab === 'away'
              ? 'bg-red-600 text-white shadow-sm font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>AWAY</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('global')}
          className={`flex-1 py-1.5 px-2 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1 text-xs ${
            currentTab === 'global'
              ? 'bg-indigo-600 text-white shadow-sm font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>全体</span>
        </button>
      </div>

      {/* 選択選手サマリーカード */}
      {currentTab === 'player' && hasSelection && (
        <div className="flex items-center gap-3 p-2.5 mb-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
          {selectedPlayer && effectiveSelectedIds.length === 1 ? (
            <>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow border border-white/20 shrink-0"
                style={{ backgroundColor: selectedPlayer.options.color }}
              >
                {selectedPlayer.shirtNo || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-100 truncate">
                  {selectedPlayer.name} ({getLastName(selectedPlayer.name)})
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span>{selectedPlayer.team.toUpperCase()}</span>
                  <span>•</span>
                  <span className="capitalize">{selectedPlayer.area}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <div className="font-bold text-slate-100">
                  {effectiveSelectedIds.length} 名の選手を一括選択中
                </div>
                <div className="text-[11px] text-slate-400">
                  一括で色・サイズ・軌道・配置を変更できます
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleBenchSelected}
            className="p-1.5 bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors shrink-0"
            title="ベンチへ送る"
          >
            <ArrowDownToLine className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 全体・チームクイック選択ボタン */}
      {(currentTab === 'home' ||
        currentTab === 'away' ||
        currentTab === 'global') && (
        <div className="flex items-center gap-1.5 mb-4 p-2 bg-slate-950/60 rounded-lg border border-slate-800">
          {currentTab === 'home' && (
            <button
              type="button"
              onClick={() => selectAllPlayers('home')}
              className="flex-1 py-1 px-2 bg-slate-800 hover:bg-blue-600/80 text-slate-200 hover:text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>HOME全選手を選択</span>
            </button>
          )}
          {currentTab === 'away' && (
            <button
              type="button"
              onClick={() => selectAllPlayers('away')}
              className="flex-1 py-1 px-2 bg-slate-800 hover:bg-red-600/80 text-slate-200 hover:text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>AWAY全選手を選択</span>
            </button>
          )}
          {currentTab === 'global' && (
            <>
              <button
                type="button"
                onClick={() => selectAllPlayers()}
                className="flex-1 py-1 px-2 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <Users className="w-3.5 h-3.5" />
                <span>ピッチ全選手を選択</span>
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold transition-colors"
              >
                解除
              </button>
            </>
          )}
        </div>
      )}

      {/* 移動軌道 (回り込み・カーブ設定) - 選択選手タブのみ */}
      {currentTab === 'player' && hasSelection && (
        <div className="mb-4 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 font-medium text-slate-300 mb-2">
            <Route className="w-3.5 h-3.5 text-indigo-400" />
            <span>移動軌道 (カーブ設定)</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-2.5">
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
              <div className="flex justify-between items-center text-[11px] text-slate-400">
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

      {/* マーカーサイズ調整コントロール (一括 & 個別) */}
      <div className="mb-4 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
        <MarkerSizeControl
          value={currentOptions.sizeScale ?? 1.0}
          onChange={handleSizeChange}
          title={
            currentTab === 'player'
              ? effectiveSelectedIds.length > 1
                ? '選択選手サイズ'
                : '選手マーカーサイズ'
              : currentTab === 'home'
                ? 'HOMEマーカーサイズ'
                : currentTab === 'away'
                  ? 'AWAYマーカーサイズ'
                  : '全マーカーサイズ一括'
          }
        />
      </div>

      {/* フォーメーション選択 (HOME / AWAY / 全体タブ時) */}
      {(currentTab === 'home' ||
        currentTab === 'away' ||
        currentTab === 'global') && (
        <div className="mb-4">
          <FormationSelectPanel
            defaultTeam={currentTab === 'away' ? 'away' : 'home'}
          />
        </div>
      )}

      {/* カラー設定 */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 font-medium text-slate-300 mb-2">
          <Palette className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {currentTab === 'player'
              ? 'マーカーカラー'
              : currentTab === 'home'
                ? 'HOMEチームカラー'
                : currentTab === 'away'
                  ? 'AWAYチームカラー'
                  : '全体カラー一括'}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2 mb-2">
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
            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 font-mono"
          />
        </div>
      </div>

      {/* マーカー内部表示 */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 font-medium text-slate-300 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-slate-400" />
          <span>内部表示</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
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

        {/* 写真アップロード & URL設定 (単一選択時のみ) */}
        {currentTab === 'player' &&
          selectedPlayer &&
          effectiveSelectedIds.length === 1 &&
          currentOptions.insideContent === 'photo' && (
            <div className="mt-3 flex flex-col gap-2.5 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              {selectedPlayer.options.photoUrl ? (
                <div className="flex items-center gap-2.5 p-2 bg-slate-900/90 rounded-md border border-slate-700/60">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500 shrink-0 bg-slate-800">
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
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>登録済み (IndexedDB)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeletePhoto}
                    disabled={isProcessingPhoto}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
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
                className={`flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                  isDraggingFile
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-900'
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
                  <div className="flex items-center gap-2 text-blue-400 py-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-[11px] font-medium">
                      画像を処理中...
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-slate-400 mb-1" />
                    <span className="text-[11px] font-medium text-slate-200">
                      画像をドロップ または 選択
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5">
                      自動で256x256正方形にトリミング & 保存
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-800/80">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Link2 className="w-3 h-3" />
                  <span>または URL を入力:</span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="https://...jpg/png"
                    value={photoInput}
                    onChange={(e) => setPhotoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePhotoUrl();
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSavePhotoUrl}
                    disabled={isProcessingPhoto || !photoInput.trim()}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs text-white transition-colors shrink-0"
                  >
                    適用
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* 下部ラベル */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 font-medium text-slate-300 mb-2">
          <Type className="w-3.5 h-3.5 text-slate-400" />
          <span>下部ラベル</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
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
            <span className="text-[10px]">ラストネーム</span>
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
      </div>
    </div>
  );
};
