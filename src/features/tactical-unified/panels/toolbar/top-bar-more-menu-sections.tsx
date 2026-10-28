'use client';

import { ImagePlus, RotateCcw, Sparkles } from 'lucide-react';
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/menu';
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
    <DropdownMenuGroup>
      <DropdownMenuLabel>Pitch &amp; Background</DropdownMenuLabel>

      <DropdownMenuItem onClick={onImportClick} className="gap-2.5 py-2">
        <ImagePlus size={14} className="text-[#FF8100] shrink-0" />
        <div className="flex flex-col">
          <span className="font-medium text-white">
            Import Background Image
          </span>
          <span className="text-[10px] text-[#A1A1AA]">
            Set screenshot or custom tactic pitch image
          </span>
        </div>
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={() => {
          onRestoreDefaultPitch();
          onClose();
        }}
        disabled={!isImageBackground}
        className="gap-2.5 py-2"
      >
        <RotateCcw size={14} className="text-[#FF8100] shrink-0" />
        <div className="flex flex-col">
          <span className="font-medium">Clear Background Image</span>
          <span className="text-[10px] text-[#A1A1AA]">
            Restore standard tactical pitch
          </span>
        </div>
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}

export interface PresetsSectionProps {
  onLoadProject: (project: TacticalProject) => void;
  onClose: () => void;
}

const PRESETS = [
  {
    title: '10-Slide Full Progression (16s)',
    desc: '10 Slides • 984 frames benchmark (Build-up to Goal)',
    factory: createTenSlideFullSequenceBenchmarkProject,
  },
  {
    title: '6-Slide Overload & Cutback (9.6s)',
    desc: '6 Slides • 576 frames benchmark (Mid-Range)',
    factory: createSixSlideBenchmarkProject,
  },
  {
    title: 'Low Block Penetration (3.8s)',
    desc: '3 Slides • Flank overload, underlap & cutback',
    factory: createLowBlockBenchmarkProject,
  },
  {
    title: 'High Press vs Build-up (1.8s)',
    desc: '2 Slides • Pressing trap bait & turnover',
    factory: createHighPressBenchmarkProject,
  },
];

export function MoreMenuPresetsSection({
  onLoadProject,
  onClose,
}: PresetsSectionProps) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>Benchmark Presets</DropdownMenuLabel>
      {PRESETS.map((p) => (
        <DropdownMenuItem
          key={p.title}
          onClick={() => {
            onLoadProject(p.factory());
            onClose();
          }}
          className="flex-col items-start gap-0.5"
        >
          <div className="flex items-center gap-1.5 font-medium text-[#60A5FA]">
            <Sparkles size={12} />
            <span>{p.title}</span>
          </div>
          <span className="text-[10px] text-[#A1A1AA] pl-4.5">{p.desc}</span>
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  );
}
