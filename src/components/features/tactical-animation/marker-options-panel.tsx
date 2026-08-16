'use client';

import {
  ArrowDownToLine,
  CornerUpLeft,
  CornerUpRight,
  EyeOff,
  Hash,
  Image as ImageIcon,
  MoveRight,
  Palette,
  Route,
  Settings2,
  Sparkles,
  Type,
  User,
  X,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { TrajectoryType } from '@/lib/tactical/trajectory';
import {
  type MarkerOptions,
  useTacticalAnimationStore,
} from '@/stores/tactical-animation-store';

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
  const setSelectedPlayerId = useTacticalAnimationStore(
    (s) => s.setSelectedPlayerId,
  );
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
  const updatePlayerTrajectory = useTacticalAnimationStore(
    (s) => s.updatePlayerTrajectory,
  );
  const updateTeamOptions = useTacticalAnimationStore(
    (s) => s.updateTeamOptions,
  );

  const [activeTab, setActiveTab] = useState<'player' | 'home' | 'away'>(
    'player',
  );
  const [photoInput, setPhotoInput] = useState('');

  const activeScene = scenes[activeSceneIndex];
  const selectedPlayer =
    selectedPlayerId && selectedPlayerId !== 'ball'
      ? activeScene?.players[selectedPlayerId]
      : null;

  // 選択された選手があれば自動でplayerタブへ
  const currentTab = selectedPlayer
    ? 'player'
    : activeTab === 'player'
      ? 'home'
      : activeTab;

  const handleColorChange = (color: string) => {
    if (currentTab === 'player' && selectedPlayer) {
      updatePlayerOptions(selectedPlayer.playerId, { color });
    } else if (currentTab === 'home') {
      updateTeamOptions('home', { color });
    } else if (currentTab === 'away') {
      updateTeamOptions('away', { color });
    }
  };

  const handleInsideContentChange = (
    insideContent: MarkerOptions['insideContent'],
  ) => {
    if (currentTab === 'player' && selectedPlayer) {
      updatePlayerOptions(selectedPlayer.playerId, { insideContent });
    } else if (currentTab === 'home') {
      updateTeamOptions('home', { insideContent });
    } else if (currentTab === 'away') {
      updateTeamOptions('away', { insideContent });
    }
  };

  const handleBottomLabelChange = (
    bottomLabel: MarkerOptions['bottomLabel'],
  ) => {
    if (currentTab === 'player' && selectedPlayer) {
      updatePlayerOptions(selectedPlayer.playerId, { bottomLabel });
    } else if (currentTab === 'home') {
      updateTeamOptions('home', { bottomLabel });
    } else if (currentTab === 'away') {
      updateTeamOptions('away', { bottomLabel });
    }
  };

  const handleTrajectoryTypeChange = (type: TrajectoryType) => {
    if (currentTab === 'player' && selectedPlayer) {
      updatePlayerTrajectory(selectedPlayer.playerId, { type });
    }
  };

  const handleCurveOffsetChange = (curveOffset: number) => {
    if (currentTab === 'player' && selectedPlayer) {
      updatePlayerTrajectory(selectedPlayer.playerId, { curveOffset });
    }
  };

  const handleSavePhotoUrl = () => {
    if (!photoInput.trim()) return;
    if (currentTab === 'player' && selectedPlayer) {
      updatePlayerOptions(selectedPlayer.playerId, {
        photoUrl: photoInput.trim(),
        insideContent: 'photo',
      });
      setPhotoInput('');
    }
  };

  const handleBenchPlayer = () => {
    if (selectedPlayer) {
      movePlayerArea(activeSceneIndex, selectedPlayer.playerId, 'bench');
      setSelectedPlayerId(null);
    }
  };

  const currentOptions: MarkerOptions =
    currentTab === 'player' && selectedPlayer
      ? selectedPlayer.options
      : currentTab === 'home'
        ? defaultHomeOptions
        : defaultAwayOptions;

  const currentTrajectory = selectedPlayer?.trajectory || {
    type: 'straight',
    curveOffset: 25,
  };

  return (
    <div className="flex flex-col w-72 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 p-4 text-white overflow-y-auto text-xs sm:text-sm">
      {/* ヘッダー */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 font-bold text-slate-200">
          <Settings2 className="w-4 h-4 text-blue-400" />
          <span>マーカー設定</span>
        </div>
        {selectedPlayer && (
          <button
            type="button"
            onClick={() => setSelectedPlayerId(null)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title="選択解除"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* タブ切り替え */}
      <div className="flex bg-slate-950 p-1 rounded-lg mb-4 border border-slate-800/80">
        {selectedPlayer && (
          <button
            type="button"
            onClick={() => setActiveTab('player')}
            className={`flex-1 py-1.5 px-2 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1.5 ${
              currentTab === 'player'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>選択選手</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`flex-1 py-1.5 px-2 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1.5 ${
            currentTab === 'home'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>HOME</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('away')}
          className={`flex-1 py-1.5 px-2 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1.5 ${
            currentTab === 'away'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>AWAY</span>
        </button>
      </div>

      {/* 選択選手情報 */}
      {currentTab === 'player' && selectedPlayer && (
        <div className="flex items-center gap-3 p-2.5 mb-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow border border-white/20"
            style={{ backgroundColor: selectedPlayer.options.color }}
          >
            {selectedPlayer.shirtNo || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-100 truncate">
              {selectedPlayer.name}
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>{selectedPlayer.team.toUpperCase()}</span>
              <span>•</span>
              <span className="capitalize">{selectedPlayer.area}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBenchPlayer}
            className="p-1.5 bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors"
            title="ベンチへ送る"
          >
            <ArrowDownToLine className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 移動軌道 (回り込み・カーブ設定) - 選択中選手のみ */}
      {currentTab === 'player' && selectedPlayer && (
        <div className="mb-4 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 font-medium text-slate-300 mb-2">
            <Route className="w-3.5 h-3.5 text-indigo-400" />
            <span>移動軌道 (回り込み)</span>
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
              title="外側 (右方向) に膨らんで回り込む"
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
              title="内側 (左方向) に膨らんで回り込む"
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

      {/* カラー設定 */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 font-medium text-slate-300 mb-2">
          <Palette className="w-3.5 h-3.5 text-slate-400" />
          <span>マーカーカラー</span>
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

        {/* 写真URL入力 (個別の選手のみ) */}
        {currentTab === 'player' &&
          selectedPlayer &&
          currentOptions.insideContent === 'photo' && (
            <div className="mt-2.5 flex flex-col gap-1.5">
              <span className="text-[11px] text-slate-400">画像 URL:</span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="https://...jpg/png"
                  value={photoInput || selectedPlayer.options.photoUrl || ''}
                  onChange={(e) => setPhotoInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                />
                <button
                  type="button"
                  onClick={handleSavePhotoUrl}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white transition-colors"
                >
                  適用
                </button>
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
            <span className="text-[10px]">名前</span>
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
