'use client';

import {
  ArrowLeftRight,
  ArrowUpDown,
  FilePlus2,
  ImagePlus,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  createHighPressBenchmarkProject,
  createLowBlockBenchmarkProject,
  createSixSlideBenchmarkProject,
  createTenSlideFullSequenceBenchmarkProject,
} from '@/lib/tactical/benchmark-presets';
import { clearActiveProjectFromDb } from '@/lib/tactical/tactical-storage';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';

interface PitchSectionProps {
  onImportClick: () => void;
  onClose: () => void;
}

function MoreMenuPitchSection({ onImportClick, onClose }: PitchSectionProps) {
  const aspectRatio = useTacticalUnifiedStore((s) => s.project.aspectRatio);
  const isImageBackground = useTacticalUnifiedStore(
    (s) => s.project.backgroundType === 'image',
  );
  const swapTeamSides = useTacticalUnifiedStore((s) => s.swapTeamSides);
  const restoreDefaultPitch = useTacticalUnifiedStore(
    (s) => s.restoreDefaultPitch,
  );

  return (
    <>
      <div className="px-3 py-1 text-[10px] uppercase font-semibold tracking-wider text-white/40">
        Pitch & Background
      </div>
      <button
        type="button"
        onClick={() => {
          swapTeamSides();
          onClose();
        }}
        className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer flex items-center gap-2.5"
      >
        {aspectRatio === '9:16' ? (
          <ArrowUpDown size={14} className="text-amber-400 shrink-0" />
        ) : (
          <ArrowLeftRight size={14} className="text-amber-400 shrink-0" />
        )}
        <div className="flex flex-col">
          <span className="font-medium text-white">Swap Sides</span>
          <span className="text-[10px] text-white/50">
            {aspectRatio === '9:16'
              ? 'Flip pitch sides vertically'
              : 'Swap pitch sides horizontally'}
          </span>
        </div>
      </button>

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
          restoreDefaultPitch();
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

function MoreMenuPresetsSection({ onClose }: { onClose: () => void }) {
  const loadProject = useTacticalUnifiedStore((s) => s.loadProject);

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
            loadProject(p.factory());
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

export function TopBarMoreMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setImageBackground = useTacticalUnifiedStore(
    (s) => s.setImageBackground,
  );
  const resetProject = useTacticalUnifiedStore((s) => s.resetProject);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0]?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) setImageBackground(dataUrl);
      };
      reader.readAsDataURL(files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsOpen(false);
  };

  const handleNewProject = async () => {
    const confirmed = window.confirm(
      '現在の戦術プロジェクトをリセットして、まっさらなピッチで新規作成しますか？',
    );
    if (!confirmed) return;
    resetProject();
    await clearActiveProjectFromDb();
    useTacticalUnifiedStore.getState().setSaveStatus('saved');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`p-1.5 rounded transition-colors cursor-pointer ${
          isOpen
            ? 'bg-white/20 text-white'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
        aria-label="More actions"
        aria-expanded={isOpen}
        title="More actions"
      >
        <MoreHorizontal size={15} />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-72 rounded-xl bg-[#18181b] border border-white/15 shadow-2xl py-1.5 z-50 overflow-hidden text-xs">
          <div className="px-3 py-1 text-[10px] uppercase font-semibold tracking-wider text-white/40">
            Project
          </div>
          <button
            type="button"
            onClick={handleNewProject}
            className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer flex items-center gap-2.5"
          >
            <FilePlus2 size={14} className="text-blue-400 shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium text-white">New Project</span>
              <span className="text-[10px] text-white/50">
                Reset canvas and start a clean project
              </span>
            </div>
          </button>

          <div className="h-px bg-white/10 my-1" />

          <MoreMenuPitchSection
            onImportClick={() => fileInputRef.current?.click()}
            onClose={() => setIsOpen(false)}
          />

          <div className="h-px bg-white/10 my-1" />

          <MoreMenuPresetsSection onClose={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  );
}
