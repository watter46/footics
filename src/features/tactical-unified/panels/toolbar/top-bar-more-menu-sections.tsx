'use client';

import { ImagePlus, RotateCcw, Sparkles } from 'lucide-react';
import type React from 'react';
import {
  createHighPressBenchmarkProject,
  createLowBlockBenchmarkProject,
  createSixSlideBenchmarkProject,
  createTenSlideFullSequenceBenchmarkProject,
} from '@/lib/tactical/benchmark-presets';
import type { TacticalProject } from '@/lib/types/tactical-unified';

export interface PitchSectionProps {
  isImageBackground: boolean;
  onRestoreDefaultPitch: () => void;
  onImportClick: () => void;
  onClose: () => void;
}

export function MoreMenuPitchSection({
  isImageBackground,
  onRestoreDefaultPitch,
  onImportClick,
  onClose,
}: PitchSectionProps) {
  return (
    <>
      <div className="px-3 py-1 text-[10px] uppercase font-semibold tracking-wider text-white/40">
        Pitch & Background
      </div>

      <button
        type="button"
        onClick={onImportClick}
        className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer flex items-center gap-2.5"
      >
        <ImagePlus size={14} className="text-emerald-400 shrink-0" />
        <div className="flex flex-col">
          <span className="font-medium text-white">
            Import Background Image
          </span>
          <span className="text-[10px] text-white/50">
            Set screenshot or custom tactic pitch image
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => {
          onRestoreDefaultPitch();
          onClose();
        }}
        disabled={!isImageBackground}
        className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2.5 ${
          isImageBackground
            ? 'hover:bg-white/10 text-white/80 hover:text-white cursor-pointer'
            : 'text-white/30 cursor-not-allowed'
        }`}
      >
        <RotateCcw
          size={14}
          className={
            isImageBackground
              ? 'text-emerald-400 shrink-0'
              : 'text-white/20 shrink-0'
          }
        />
        <div className="flex flex-col">
          <span className="font-medium">Clear Background Image</span>
          <span className="text-[10px] text-white/50">
            Restore standard tactical pitch
          </span>
        </div>
      </button>
    </>
  );
}

export interface PresetsSectionProps {
  onLoadProject: (project: TacticalProject) => void;
  onClose: () => void;
}

export function MoreMenuPresetsSection({
  onLoadProject,
  onClose,
}: PresetsSectionProps) {
  const presets = [
    {
      title: '10-Slide Full Progression (16s)',
      desc: '10 Slides • 984 frames benchmark (Build-up to Goal)',
      color: 'text-emerald-300',
      factory: createTenSlideFullSequenceBenchmarkProject,
    },
    {
      title: '6-Slide Overload & Cutback (9.6s)',
      desc: '6 Slides • 576 frames benchmark (Mid-Range)',
      color: 'text-blue-300',
      factory: createSixSlideBenchmarkProject,
    },
    {
      title: 'Low Block Penetration (3.8s)',
      desc: '3 Slides • Flank overload, underlap & cutback',
      color: 'text-purple-300',
      factory: createLowBlockBenchmarkProject,
    },
    {
      title: 'High Press vs Build-up (1.8s)',
      desc: '2 Slides • Pressing trap bait & turnover',
      color: 'text-amber-300',
      factory: createHighPressBenchmarkProject,
    },
  ];

  return (
    <>
      <div className="px-3 py-1 text-[10px] uppercase font-semibold tracking-wider text-white/40">
        Benchmark Presets
      </div>
      {presets.map((p) => (
        <button
          key={p.title}
          type="button"
          onClick={() => {
            onLoadProject(p.factory());
            onClose();
          }}
          className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-white transition-colors cursor-pointer flex flex-col gap-0.5"
        >
          <div className={`flex items-center gap-1.5 font-medium ${p.color}`}>
            <Sparkles size={12} />
            <span>{p.title}</span>
          </div>
          <span className="text-[10px] text-white/50 pl-4.5">{p.desc}</span>
        </button>
      ))}
    </>
  );
}
