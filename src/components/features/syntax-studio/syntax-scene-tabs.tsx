'use client';

import { ChevronLeft, ChevronRight, Layers, Pause, Play } from 'lucide-react';
import React from 'react';
import type { TacticalScene } from '@/lib/types/syntax-integration';

interface SyntaxSceneTabsProps {
  scenes: TacticalScene[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  className?: string;
}

export const SyntaxSceneTabs: React.FC<SyntaxSceneTabsProps> = ({
  scenes,
  currentIndex,
  onSelectIndex,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const playTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const totalScenes = scenes.length > 0 ? scenes.length : 4;

  const handlePrev = () => {
    onSelectIndex((currentIndex - 1 + totalScenes) % totalScenes);
  };

  const handleNext = () => {
    onSelectIndex((currentIndex + 1) % totalScenes);
  };

  React.useEffect(() => {
    if (isPlaying && totalScenes > 1) {
      playTimerRef.current = setInterval(() => {
        onSelectIndex((currentIndex + 1) % totalScenes);
      }, 2000);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, totalScenes, currentIndex, onSelectIndex]);

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 shadow-lg ${className}`}
    >
      {/* 左右ナビゲーション & 再生コントロール */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={handlePrev}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
          title="Previous Scene (←)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-1.5 rounded-lg transition-colors focus:outline-none ${
            isPlaying
              ? 'text-cyan-400 bg-cyan-950/60 border border-cyan-800/50'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title={isPlaying ? 'Pause Sequence' : 'Play Sequence'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
          title="Next Scene (→)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 4コマ切り替えタブ一覧 */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
        {Array.from({ length: totalScenes }).map((_, idx) => {
          const scene = scenes[idx];
          const isSelected = currentIndex === idx;
          const label = `Scene ${idx + 1}`;
          const title = scene?.title || `Phase ${idx + 1}`;
          const tabKey = scene?.id
            ? `scene-key-${scene.id}`
            : `scene-idx-${idx}`;

          return (
            <button
              key={tabKey}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`group flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap focus:outline-none ${
                isSelected
                  ? 'bg-gradient-to-r from-cyan-600/90 to-blue-600/90 text-white shadow-md shadow-cyan-900/40 border border-cyan-400/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/40'
              }`}
            >
              <Layers
                className={`w-3.5 h-3.5 ${
                  isSelected ? 'text-cyan-200' : 'text-slate-500'
                }`}
              />
              <span>{label}</span>
              {scene?.title && (
                <span
                  className={`hidden sm:inline-block max-w-[120px] truncate text-[11px] font-normal ${
                    isSelected
                      ? 'text-cyan-100'
                      : 'text-slate-500 group-hover:text-slate-400'
                  }`}
                >
                  : {title.replace(/^Phase \d+:\s*/, '')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 現在の進行状況バッジ */}
      <div className="hidden md:flex items-center shrink-0">
        <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 bg-slate-950/80 rounded border border-slate-800">
          {currentIndex + 1} / {totalScenes}
        </span>
      </div>
    </div>
  );
};
