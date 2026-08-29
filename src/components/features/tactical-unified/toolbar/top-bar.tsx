'use client';

/**
 * top-bar.tsx
 * Figma-like Top Bar:
 *  - Title & Quick Tools: Swap Pitch, Reset Pitch, Import Image, Benchmark Test Presets Dropdown
 *  - Center: Aspect Ratio Switcher (16:9 / 9:16)
 *  - Right: Right panel toggles (Formation & Squad / Properties), Copy PNG, Export
 */

import {
  ArrowLeftRight,
  ArrowUpDown,
  ChevronDown,
  Copy,
  FlaskConical,
  ImagePlus,
  LayoutTemplate,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  createHighPressBenchmarkProject,
  createLowBlockBenchmarkProject,
} from '@/lib/tactical/benchmark-presets';
import type { AspectRatio } from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';

export function TopBar() {
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const aspectRatio = useTacticalUnifiedStore((s) => s.project.aspectRatio);
  const setAspectRatio = useTacticalUnifiedStore((s) => s.setAspectRatio);
  const openExportModal = useTacticalUnifiedStore((s) => s.openExportModal);
  const swapTeamSides = useTacticalUnifiedStore((s) => s.swapTeamSides);
  const restoreDefaultPitch = useTacticalUnifiedStore(
    (s) => s.restoreDefaultPitch,
  );
  const setImageBackground = useTacticalUnifiedStore(
    (s) => s.setImageBackground,
  );
  const loadProject = useTacticalUnifiedStore((s) => s.loadProject);
  const rightPanelTab = useTacticalUnifiedStore((s) => s.panels.rightPanelTab);
  const setRightPanelTab = useTacticalUnifiedStore((s) => s.setRightPanelTab);

  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close preset dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        presetMenuRef.current &&
        !presetMenuRef.current.contains(e.target as Node)
      ) {
        setIsPresetMenuOpen(false);
      }
    };
    if (isPresetMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isPresetMenuOpen]);

  function handleCopy() {
    window.dispatchEvent(new CustomEvent('tactical:copy-png'));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            setImageBackground(dataUrl);
          }
        };
        reader.readAsDataURL(file);
      }
    }
    // reset
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const handleLoadLowBlock = () => {
    const project = createLowBlockBenchmarkProject();
    loadProject(project);
    setIsPresetMenuOpen(false);
  };

  const handleLoadHighPress = () => {
    const project = createHighPressBenchmarkProject();
    loadProject(project);
    setIsPresetMenuOpen(false);
  };

  const nextRatio: AspectRatio = aspectRatio === '16:9' ? '9:16' : '16:9';

  return (
    <header className="flex items-center justify-between h-11 px-3 bg-[#111] border-b border-white/10 shrink-0 z-50 select-none">
      {/* Left: Quick Pitch Tools & Benchmark Presets */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold tracking-wide text-white/90 mr-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Tactical
        </span>

        <div className="h-4 w-px bg-white/10" />

        {/* Swap Pitch / Sides */}
        <button
          type="button"
          onClick={() => swapTeamSides(activeSlideId)}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors cursor-pointer"
          title={
            aspectRatio === '9:16'
              ? 'Flip pitch sides vertically'
              : 'Swap pitch sides horizontally'
          }
        >
          {aspectRatio === '9:16' ? (
            <ArrowUpDown size={13} className="text-amber-400" />
          ) : (
            <ArrowLeftRight size={13} className="text-amber-400" />
          )}
          <span>Swap Sides</span>
        </button>

        {/* Reset Pitch Background */}
        <button
          type="button"
          onClick={restoreDefaultPitch}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors cursor-pointer"
          title="Reset to default pitch background"
        >
          <RotateCcw size={13} className="text-emerald-400" />
          <span>Reset Pitch</span>
        </button>

        {/* Import Image */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors cursor-pointer"
          title="Import image file as background"
        >
          <ImagePlus size={13} className="text-sky-400" />
          <span>Import Image</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Benchmark Test Presets Dropdown */}
        <div className="relative" ref={presetMenuRef}>
          <button
            type="button"
            onClick={() => setIsPresetMenuOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200 border border-purple-500/30 text-xs font-medium transition-colors cursor-pointer"
            title="Load benchmark tactical scene presets for verification"
          >
            <FlaskConical size={13} className="text-purple-400" />
            <span>Test Presets</span>
            <ChevronDown size={12} className="opacity-70" />
          </button>

          {isPresetMenuOpen && (
            <div className="absolute left-0 top-full mt-1 w-64 rounded-xl bg-[#18181b] border border-white/15 shadow-2xl py-1.5 z-50 overflow-hidden">
              <div className="px-3 py-1 text-[10px] uppercase font-semibold tracking-wider text-white/40">
                Benchmark Scenarios
              </div>
              <button
                type="button"
                onClick={handleLoadLowBlock}
                className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 text-white transition-colors cursor-pointer flex flex-col gap-0.5"
              >
                <div className="flex items-center gap-1.5 font-medium text-purple-300">
                  <Sparkles size={12} />
                  <span>Low Block Penetration</span>
                </div>
                <span className="text-[10px] text-white/50">
                  3 Slides • Flank overload, underlap & cutback
                </span>
              </button>
              <button
                type="button"
                onClick={handleLoadHighPress}
                className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 text-white transition-colors cursor-pointer flex flex-col gap-0.5"
              >
                <div className="flex items-center gap-1.5 font-medium text-amber-300">
                  <Sparkles size={12} />
                  <span>High Press vs Build-up</span>
                </div>
                <span className="text-[10px] text-white/50">
                  2 Slides • Pressing trap bait & turnover
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center: Aspect Ratio */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setAspectRatio(nextRatio)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/80 hover:text-white transition-colors cursor-pointer"
          aria-label="Switch aspect ratio"
          title="Switch Aspect Ratio (16:9 / 9:16)"
        >
          <LayoutTemplate size={13} className="text-blue-400" />
          <span>{aspectRatio}</span>
        </button>
      </div>

      {/* Right: Panel Toggles & Export */}
      <div className="flex items-center gap-1.5">
        {/* Right panel toggle icons */}
        <div className="flex items-center p-0.5 rounded-lg bg-white/5 border border-white/10 mr-1">
          <button
            type="button"
            onClick={() => setRightPanelTab('formation_sub')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              rightPanelTab === 'formation_sub'
                ? 'bg-blue-600 text-white shadow'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Formation & Squad Panel"
            aria-label="Formation & Squad Panel"
          >
            <Users size={14} />
          </button>

          <button
            type="button"
            onClick={() => setRightPanelTab('inspector')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              rightPanelTab === 'inspector'
                ? 'bg-blue-600 text-white shadow'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Properties & Settings Panel"
            aria-label="Properties & Settings Panel"
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>

        {/* Copy PNG */}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs transition-colors cursor-pointer"
          aria-label="Copy PNG"
          title="Copy current slide image to clipboard"
        >
          <Copy size={13} />
          <span>Copy PNG</span>
        </button>

        {/* Export Modal */}
        <button
          type="button"
          onClick={() => openExportModal()}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
          aria-label="Export"
          title="Export image or video"
        >
          <Upload size={13} />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
}
