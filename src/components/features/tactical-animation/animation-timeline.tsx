'use client';

import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  Film,
  Loader2,
  Play,
  Plus,
  SlidersHorizontal,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useTacticalAnimation } from '@/hooks/use-tactical-animation';
import { useTacticalVideoExport } from '@/hooks/use-tactical-video-export';
import { EASING_OPTIONS, type EasingType } from '@/lib/tactical/easing';
import { useTacticalAnimationStore } from '@/stores/tactical-animation-store';
import type { AnimationPitchRef } from './animation-pitch';

interface AnimationTimelineProps {
  pitchRef: React.RefObject<AnimationPitchRef | null>;
}

export const AnimationTimeline: React.FC<AnimationTimelineProps> = ({
  pitchRef,
}) => {
  const scenes = useTacticalAnimationStore((s) => s.scenes);
  const activeSceneIndex = useTacticalAnimationStore((s) => s.activeSceneIndex);
  const isPlaying = useTacticalAnimationStore((s) => s.isPlaying);
  const defaultEasing = useTacticalAnimationStore((s) => s.defaultEasing);
  const batchUpdateScenes = useTacticalAnimationStore(
    (s) => s.batchUpdateScenes,
  );

  const setActiveSceneIndex = useTacticalAnimationStore(
    (s) => s.setActiveSceneIndex,
  );
  const addScene = useTacticalAnimationStore((s) => s.addScene);
  const duplicateScene = useTacticalAnimationStore((s) => s.duplicateScene);
  const removeScene = useTacticalAnimationStore((s) => s.removeScene);
  const updateScene = useTacticalAnimationStore((s) => s.updateScene);

  const { playAnimation, stopAnimation } = useTacticalAnimation();
  const { startExport, isExporting, exportProgress, exportError } =
    useTacticalVideoExport();

  // 一括設定モーダル状態
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchDuration, setBatchDuration] = useState<number>(1500);
  const [batchPause, setBatchPause] = useState<number>(500);
  const [batchEasing, setBatchEasing] = useState<EasingType>('easeInOut');

  // タイムライン自体の最小化トグル
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);

  const handlePlay = () => {
    const stage = pitchRef.current?.getStage();
    if (isPlaying) {
      stopAnimation(stage);
    } else {
      setActiveSceneIndex(0);
      requestAnimationFrame(() => {
        if (stage) {
          playAnimation(stage);
        }
      });
    }
  };

  const handleExport = () => {
    if (scenes.length <= 1) {
      alert('動画をエクスポートするには2つ以上のシーンが必要です。');
      return;
    }

    startExport({
      backgroundColor: '#020617',
      fps: 60,
      bitrate: 16000000,
    });
  };

  const handleApplyBatchSettings = () => {
    batchUpdateScenes({
      durationMs: batchDuration,
      pauseMs: batchPause,
      easing: batchEasing,
    });
    setIsBatchModalOpen(false);
  };

  return (
    <div className="flex flex-col bg-slate-900 border-t border-slate-800 shrink-0 select-none transition-all duration-200">
      {/* タイムラインツールバー */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {/* 再生ボタン */}
          <button
            type="button"
            onClick={handlePlay}
            disabled={isExporting || scenes.length <= 1}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shadow-md transition-all ${
              isPlaying
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5" /> 停止
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" /> 再生
              </>
            )}
          </button>

          {/* エクスポートボタン */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isPlaying || isExporting || scenes.length <= 1}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold text-xs shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> 保存中{' '}
                {exportProgress}%
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> 動画保存
              </>
            )}
          </button>

          {/* 一括設定ボタン */}
          <button
            type="button"
            onClick={() => setIsBatchModalOpen(true)}
            disabled={isPlaying || isExporting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-slate-700 disabled:opacity-50"
            title="全シーンの速度や時間を一括変更"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>一括設定</span>
          </button>

          {exportError && (
            <span className="text-xs text-red-400 font-medium">
              {exportError}
            </span>
          )}
        </div>

        {/* 右側アクション & 最小化トグル */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addScene}
            disabled={isPlaying || isExporting}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition-colors border border-slate-700 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" /> シーン追加
          </button>

          <button
            type="button"
            onClick={() => setIsTimelineCollapsed(!isTimelineCollapsed)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs transition-colors"
            title={
              isTimelineCollapsed
                ? 'タイムラインを展開'
                : 'タイムラインを最小化'
            }
          >
            {isTimelineCollapsed ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* シーンサムネイル・タイムライン一覧 */}
      {!isTimelineCollapsed && (
        <div className="flex gap-2 overflow-x-auto p-2.5 scrollbar-thin scrollbar-thumb-slate-700">
          {scenes.map((scene, index) => {
            const isActive = activeSceneIndex === index;
            const isLast = index === scenes.length - 1;
            const currentEasing = scene.easing || defaultEasing;

            return (
              <div
                key={scene.id}
                className={`flex flex-col min-w-[200px] max-w-[210px] bg-slate-950/90 rounded-lg p-2.5 cursor-pointer border transition-all shadow-sm ${
                  isActive
                    ? 'border-blue-500 ring-1 ring-blue-500/30 bg-slate-900'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
                onClick={() => {
                  if (!isPlaying && !isExporting) {
                    setActiveSceneIndex(index);
                  }
                }}
              >
                {/* シーンヘッダー */}
                <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-slate-800/80">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-200">
                    <Film className="w-3 h-3 text-blue-400" />
                    <span>シーン {index + 1}</span>
                    {isActive && (
                      <span className="px-1 py-0.1 text-[9px] bg-blue-500/20 text-blue-400 rounded font-normal">
                        選択中
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5">
                    {/* 複製 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isPlaying && !isExporting) duplicateScene(index);
                      }}
                      className="text-slate-400 hover:text-slate-200 p-0.5 rounded hover:bg-slate-800 transition-colors"
                      title="シーンを複製"
                    >
                      <Copy className="w-3 h-3" />
                    </button>

                    {/* 削除 */}
                    {scenes.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isPlaying && !isExporting) removeScene(index);
                        }}
                        className="text-slate-400 hover:text-rose-400 p-0.5 rounded hover:bg-slate-800 transition-colors"
                        title="シーンを削除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* シーン設定 */}
                {!isLast ? (
                  <div className="flex flex-col gap-1.5 text-xs">
                    {/* 移動時間 */}
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-2.5 h-2.5 text-blue-400" /> 移動
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={scene.durationMs}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            updateScene(index, {
                              durationMs: Math.max(100, Number(e.target.value)),
                            })
                          }
                          className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[11px] text-white text-right font-mono"
                          step={100}
                          min={100}
                        />
                        <span className="text-[9px] text-slate-500">ms</span>
                      </div>
                    </div>

                    {/* 停止時間 */}
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-2.5 h-2.5 text-amber-400" /> 停止
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={scene.pauseMs}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            updateScene(index, {
                              pauseMs: Math.max(0, Number(e.target.value)),
                            })
                          }
                          className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[11px] text-white text-right font-mono"
                          step={100}
                          min={0}
                        />
                        <span className="text-[9px] text-slate-500">ms</span>
                      </div>
                    </div>

                    {/* 速度変化 (Easing) */}
                    <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/60">
                      <span
                        className="flex items-center gap-1 text-[11px] text-slate-400"
                        title="移動時の速度変化"
                      >
                        <Activity className="w-2.5 h-2.5 text-indigo-400" />{' '}
                        速度
                      </span>
                      <select
                        value={currentEasing}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          updateScene(index, {
                            easing: e.target.value as EasingType,
                          })
                        }
                        className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-1 py-0.5 text-[11px] focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {EASING_OPTIONS.map((opt) => (
                          <option
                            key={opt.value}
                            value={opt.value}
                            title={opt.description}
                          >
                            {opt.shortLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 text-center text-[10px] text-slate-500 font-medium">
                    最終ポーズ位置
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 一括設定モーダル */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 w-full max-w-md shadow-2xl text-white animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-2.5 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <span>全シーン一括設定</span>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 移動時間一括 */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  移動時間 (Duration)
                </label>
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="number"
                    value={batchDuration}
                    onChange={(e) =>
                      setBatchDuration(Math.max(100, Number(e.target.value)))
                    }
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-mono text-white"
                    step={100}
                    min={100}
                  />
                  <span className="text-slate-400">ms</span>
                </div>
                <div className="flex gap-1.5">
                  {[500, 1000, 1500, 2000, 3000].map((ms) => (
                    <button
                      type="button"
                      key={ms}
                      onClick={() => setBatchDuration(ms)}
                      className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                        batchDuration === ms
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {ms / 1000}s
                    </button>
                  ))}
                </div>
              </div>

              {/* 停止時間一括 */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  停止時間 (Pause)
                </label>
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="number"
                    value={batchPause}
                    onChange={(e) =>
                      setBatchPause(Math.max(0, Number(e.target.value)))
                    }
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-mono text-white"
                    step={100}
                    min={0}
                  />
                  <span className="text-slate-400">ms</span>
                </div>
                <div className="flex gap-1.5">
                  {[0, 300, 500, 1000].map((ms) => (
                    <button
                      type="button"
                      key={ms}
                      onClick={() => setBatchPause(ms)}
                      className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                        batchPause === ms
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {ms === 0 ? 'なし' : `${ms}ms`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 速度変化一括 */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  速度変化 (Easing)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {EASING_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setBatchEasing(opt.value)}
                      className={`p-2 rounded text-left border transition-all ${
                        batchEasing === opt.value
                          ? 'bg-indigo-950/80 border-indigo-500 ring-1 ring-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-xs text-indigo-300">
                        {opt.label}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {opt.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleApplyBatchSettings}
                className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded text-xs font-bold shadow"
              >
                全シーンに一括適用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
