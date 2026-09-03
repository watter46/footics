'use client';

import { Clock, Info, Layers, LayoutGrid, Trash2 } from 'lucide-react';
import type {
  Easing,
  Slide,
  TacticalProject,
} from '@/lib/types/tactical-unified';

export function SlideSettingsInspector({
  project,
  activeSlide,
  slidesCount,
  setBackgroundType,
  updateSlideTransition,
  deleteSlide,
}: {
  project: TacticalProject;
  activeSlide?: Slide;
  slidesCount: number;
  setBackgroundType: (t: TacticalProject['backgroundType']) => void;
  updateSlideTransition: (
    slideId: string,
    params: Partial<Pick<Slide, 'transitionDurationMs' | 'pauseMs' | 'easing'>>,
  ) => void;
  deleteSlide: (slideId: string) => void;
}) {
  const homeCount =
    activeSlide?.players.filter((p) => p.team === 'home').length ?? 0;
  const awayCount =
    activeSlide?.players.filter((p) => p.team === 'away').length ?? 0;
  const arrowCount = activeSlide?.arrows.length ?? 0;
  const zoneCount = activeSlide?.zones.length ?? 0;
  const textCount = activeSlide?.texts.length ?? 0;

  const bgOptions: {
    label: string;
    value: TacticalProject['backgroundType'];
  }[] = [
    { label: 'Pitch', value: 'pitch' },
    { label: 'Image', value: 'image' },
    { label: 'Blank', value: 'blank' },
  ];

  const easingOptions: { label: string; value: Easing }[] = [
    { label: 'Ease In Out', value: 'ease-in-out' },
    { label: 'Ease In', value: 'ease-in' },
    { label: 'Ease Out', value: 'ease-out' },
    { label: 'Linear', value: 'linear' },
  ];

  const durationSec = activeSlide
    ? (activeSlide.transitionDurationMs / 1000).toFixed(1)
    : '1.0';
  const pauseSec = activeSlide
    ? (activeSlide.pauseMs / 1000).toFixed(1)
    : '0.5';

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-white select-none custom-scrollbar">
      {/* 1. Slide Timing & Animation Settings */}
      {activeSlide && (
        <div className="space-y-3">
          <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={13} className="text-blue-400" />
            Slide Timing & Animation
          </span>

          {/* Duration */}
          <div className="space-y-1 bg-white/[0.02] p-2.5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Duration</span>
              <span className="font-mono text-blue-400 font-bold">
                {durationSec}s
              </span>
            </div>
            <input
              type="range"
              min={200}
              max={5000}
              step={100}
              value={activeSlide.transitionDurationMs}
              onChange={(e) =>
                updateSlideTransition(activeSlide.id, {
                  transitionDurationMs: parseInt(e.target.value, 10),
                })
              }
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/30 font-mono">
              <span>0.2s</span>
              <span>5.0s</span>
            </div>
          </div>

          {/* Pause */}
          <div className="space-y-1 bg-white/[0.02] p-2.5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Pause</span>
              <span className="font-mono text-emerald-400 font-bold">
                {pauseSec}s
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={3000}
              step={100}
              value={activeSlide.pauseMs}
              onChange={(e) =>
                updateSlideTransition(activeSlide.id, {
                  pauseMs: parseInt(e.target.value, 10),
                })
              }
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/30 font-mono">
              <span>0.0s</span>
              <span>3.0s</span>
            </div>
          </div>

          {/* Easing */}
          <div className="space-y-1.5 bg-white/[0.02] p-2.5 rounded-lg border border-white/10">
            <span className="text-xs text-white/60 block">Easing</span>
            <div className="grid grid-cols-2 gap-1">
              {easingOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    updateSlideTransition(activeSlide.id, { easing: opt.value })
                  }
                  className={`px-2 py-1.5 rounded text-[11px] font-medium border transition-all text-center ${
                    activeSlide.easing === opt.value
                      ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-sm'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Pitch Background */}
      <div className="pt-3 border-t border-white/10 space-y-2">
        <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
          <LayoutGrid size={13} className="text-emerald-400" />
          Pitch Background
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {bgOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBackgroundType(opt.value)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all text-center truncate ${
                project.backgroundType === opt.value
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Slide Elements Summary */}
      <div className="pt-3 border-t border-white/10 space-y-2">
        <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
          <Layers size={13} className="text-purple-400" />
          Slide Elements
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-white/40 block">
              Players (H / A)
            </span>
            <span className="font-mono font-bold text-white">
              {homeCount} <span className="text-white/40 font-normal">/</span>{' '}
              {awayCount}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-white/40 block">
              Arrows / Zones / Text
            </span>
            <span className="font-mono font-bold text-white">
              {arrowCount} <span className="text-white/40 font-normal">/</span>{' '}
              {zoneCount} <span className="text-white/40 font-normal">/</span>{' '}
              {textCount}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Delete Slide Action */}
      {activeSlide && (
        <div className="pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              if (slidesCount <= 1) return;
              if (
                window.confirm('Are you sure you want to delete this slide?')
              ) {
                deleteSlide(activeSlide.id);
              }
            }}
            disabled={slidesCount <= 1}
            className="w-full py-2 rounded-lg border border-red-500/40 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Delete Slide</span>
          </button>
          {slidesCount <= 1 && (
            <p className="text-[10px] text-white/30 text-center mt-1">
              At least one slide is required in project.
            </p>
          )}
        </div>
      )}

      {/* 5. Guide / Hints */}
      <div className="pt-3 border-t border-white/10">
        <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200/80 leading-relaxed flex items-start gap-2">
          <Info size={14} className="shrink-0 text-blue-400 mt-0.5" />
          <span>
            Click on any player, arrow, zone, or text on the pitch to edit its
            detailed properties (Vision Cone, Connectors, Badges, etc.).
          </span>
        </div>
      </div>
    </div>
  );
}
