'use client';

import { ArrowUpToLine, ChevronDown, ChevronUp, Users } from 'lucide-react';
import type React from 'react';
import { useTacticalAnimationStore } from '@/stores/tactical-animation-store';

export const AnimationBench: React.FC = () => {
  const isBenchOpen = useTacticalAnimationStore((s) => s.isBenchOpen);
  const setIsBenchOpen = useTacticalAnimationStore((s) => s.setIsBenchOpen);
  const benchTeam = useTacticalAnimationStore((s) => s.benchTeam);
  const setBenchTeam = useTacticalAnimationStore((s) => s.setBenchTeam);
  const activeSceneIndex = useTacticalAnimationStore((s) => s.activeSceneIndex);
  const scenes = useTacticalAnimationStore((s) => s.scenes);
  const movePlayerArea = useTacticalAnimationStore((s) => s.movePlayerArea);
  const setSelectedPlayerId = useTacticalAnimationStore(
    (s) => s.setSelectedPlayerId,
  );
  const selectedPlayerId = useTacticalAnimationStore((s) => s.selectedPlayerId);

  const activeScene = scenes[activeSceneIndex];
  const allPlayers = activeScene ? Object.values(activeScene.players) : [];

  const teamPlayers = allPlayers.filter((p) => p.team === benchTeam);
  const benchPlayers = teamPlayers.filter((p) => p.area === 'bench');
  const pitchPlayers = teamPlayers.filter((p) => p.area === 'pitch');

  const handlePutOnPitch = (playerId: string) => {
    // ピッチの適切な位置（中央付近に少しランダムオフセット）に配置
    const offsetX = 40 + Math.random() * 20;
    const offsetY = 40 + Math.random() * 20;
    movePlayerArea(activeSceneIndex, playerId, 'pitch', {
      x: offsetX,
      y: offsetY,
    });
    setSelectedPlayerId(playerId);
  };

  const _handleSendToBench = (playerId: string) => {
    movePlayerArea(activeSceneIndex, playerId, 'bench');
    if (selectedPlayerId === playerId) {
      setSelectedPlayerId(null);
    }
  };

  return (
    <div className="flex flex-col bg-slate-900 border-t border-slate-800 transition-all duration-300 shrink-0 select-none">
      {/* バー（トグルヘッダー） */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsBenchOpen(!isBenchOpen)}
            className="flex items-center gap-2 text-sm font-bold text-slate-200 hover:text-white transition-colors"
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span>控え・ベンチ管理</span>
            {isBenchOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>

          {/* チーム切り替え */}
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setBenchTeam('home')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                benchTeam === 'home'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span>HOME ({pitchPlayers.length}/11)</span>
            </button>
            <button
              type="button"
              onClick={() => setBenchTeam('away')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                benchTeam === 'away'
                  ? 'bg-red-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span>
                AWAY ({teamPlayers.filter((p) => p.area === 'pitch').length}/11)
              </span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          ベンチ選手数:{' '}
          <span className="font-semibold text-white">
            {benchPlayers.length}
          </span>{' '}
          人
        </div>
      </div>

      {/* 開閉コンテンツ */}
      {isBenchOpen && (
        <div className="p-3 max-h-48 overflow-y-auto bg-slate-950/60">
          {benchPlayers.length === 0 ? (
            <div className="text-center py-4 text-slate-500 text-xs">
              ベンチに選手はいません（全選手がピッチ上に配置されています）
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {benchPlayers.map((player) => {
                const isSelected = selectedPlayerId === player.playerId;
                return (
                  <div
                    key={player.playerId}
                    onClick={() => setSelectedPlayerId(player.playerId)}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: player.options.color }}
                      >
                        {player.shirtNo || '-'}
                      </div>
                      <div className="truncate text-xs font-medium text-slate-200">
                        {player.name}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePutOnPitch(player.playerId);
                      }}
                      className="p-1 text-slate-400 hover:text-green-400 hover:bg-slate-800 rounded transition-colors ml-1"
                      title="ピッチへ投入"
                    >
                      <ArrowUpToLine className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
