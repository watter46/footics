'use client';

/**
 * top-bar.tsx
 * Figma-like Top Bar:
 *  - Title & Quick Tools: Swap Pitch, Reset Pitch, Import Image, Benchmark Test Presets Dropdown
 *  - Center: Aspect Ratio Switcher (16:9 / 9:16)
 *  - Right: Right panel toggles (Formation & Squad / Properties), Copy PNG, Export
 */

import {
  AlertCircle,
  ArrowLeftRight,
  ArrowUpDown,
  Check,
  ChevronDown,
  Copy,
  FilePlus2,
  FlaskConical,
  FolderKanban,
  ImagePlus,
  LayoutTemplate,
  Loader2,
  Pencil,
  Redo2,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  Upload,
  Users,
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
import type { AspectRatio } from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';

export function TopBar() {
  const projectTitle = useTacticalUnifiedStore(
    (s) => s.project.title || 'Untitled Project',
  );
  const setTitle = useTacticalUnifiedStore((s) => s.setTitle);
  const openProjectManagerModal = useTacticalUnifiedStore(
    (s) => s.openProjectManagerModal,
  );
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
  const resetProject = useTacticalUnifiedStore((s) => s.resetProject);
  const saveStatus = useTacticalUnifiedStore((s) => s.saveStatus);
  const undo = useTacticalUnifiedStore((s) => s.undo);
  const redo = useTacticalUnifiedStore((s) => s.redo);
  const canUndo = useTacticalUnifiedStore((s) => s.past.length > 0);
  const canRedo = useTacticalUnifiedStore((s) => s.future.length > 0);
  const rightPanelTab = useTacticalUnifiedStore((s) => s.panels.rightPanelTab);
  const setRightPanelTab = useTacticalUnifiedStore((s) => s.setRightPanelTab);
  const isImageBackground = useTacticalUnifiedStore(
    (s) => s.project.backgroundType === 'image',
  );
  const teamVisibility = useTacticalUnifiedStore((s) => s.teamVisibility);
  const setTeamVisibility = useTacticalUnifiedStore((s) => s.setTeamVisibility);
  const homeColor = useTacticalUnifiedStore((s) => s.project.homeColor.primary);
  const awayColor = useTacticalUnifiedStore((s) => s.project.awayColor.primary);

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

  const handleLoadSixSlides = () => {
    const project = createSixSlideBenchmarkProject();
    loadProject(project);
    setIsPresetMenuOpen(false);
  };

  const handleLoadTenSlides = () => {
    const project = createTenSlideFullSequenceBenchmarkProject();
    loadProject(project);
    setIsPresetMenuOpen(false);
  };

  const handleNewProject = async () => {
    const confirmed = window.confirm(
      '現在の戦術プロジェクトをリセットして、まっさらなピッチで新規作成しますか？',
    );
    if (!confirmed) return;
    resetProject();
    await clearActiveProjectFromDb();
    useTacticalUnifiedStore.getState().setSaveStatus('saved');
  };

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(projectTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempTitle(projectTitle);
  }, [projectTitle]);

  const handleStartTitleEdit = () => {
    setTempTitle(projectTitle);
    setIsEditingTitle(true);
    setTimeout(() => {
      titleInputRef.current?.select();
    }, 50);
  };

  const handleSaveTitle = () => {
    const trimmed = tempTitle.trim() || 'Untitled Project';
    setTitle(trimmed);
    setIsEditingTitle(false);
  };

  const nextRatio: AspectRatio = aspectRatio === '16:9' ? '9:16' : '16:9';

  return (
    <header className="flex items-center justify-between h-11 px-3 bg-[#111] border-b border-white/10 shrink-0 z-50 select-none">
      {/* Left: Quick Pitch Tools & Benchmark Presets */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold tracking-wide text-white/90 mr-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Tactical
        </span>

        {/* Save Status Indicator */}
        <div className="flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium select-none">
          {saveStatus === 'saving' && (
            <div
              className="flex items-center gap-1 text-amber-400/90"
              title="Auto-saving to IndexedDB..."
            >
              <Loader2 size={11} className="animate-spin" />
              <span className="hidden md:inline">Saving</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div
              className="flex items-center gap-1 text-emerald-400/80"
              title="All changes saved to IndexedDB"
            >
              <Check size={11} />
              <span className="hidden md:inline">Saved</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div
              className="flex items-center gap-1 text-rose-400"
              title="Failed to save changes"
            >
              <AlertCircle size={11} />
              <span className="hidden md:inline">Save Error</span>
            </div>
          )}
          {saveStatus === 'idle' && (
            <div
              className="flex items-center gap-1 text-white/40"
              title="Ready"
            >
              <Check size={11} className="opacity-40" />
              <span className="hidden md:inline">Saved</span>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-white/10" />

        {/* Project Manager & Editable Title */}
        <div className="flex items-center gap-1.5 ml-0.5">
          <button
            type="button"
            onClick={openProjectManagerModal}
            className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-blue-200 border border-blue-500/30 text-xs font-medium transition-colors cursor-pointer"
            title="Open Project Manager"
          >
            <FolderKanban size={13} className="text-blue-400" />
            <span className="hidden md:inline">Projects</span>
          </button>

          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                ref={titleInputRef}
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setTempTitle(projectTitle);
                    setIsEditingTitle(false);
                  }
                }}
                className="px-2 py-0.5 bg-black/60 border border-blue-500 rounded text-xs text-white font-medium focus:outline-none w-36 sm:w-48 truncate"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
                title="Save Title"
              >
                <Check size={11} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartTitleEdit}
              className="group flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 text-white/90 hover:text-white text-xs font-medium max-w-[140px] sm:max-w-[200px] truncate transition-colors cursor-pointer"
              title="Click to rename project"
            >
              <span className="truncate">{projectTitle}</span>
              <Pencil
                size={10}
                className="opacity-0 group-hover:opacity-70 transition-opacity text-white/60 shrink-0"
              />
            </button>
          )}
        </div>

        {/* New Project */}
        <button
          type="button"
          onClick={handleNewProject}
          className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors cursor-pointer"
          title="Create a new clean tactical project"
        >
          <FilePlus2 size={13} className="text-blue-400" />
          <span className="hidden sm:inline">New</span>
        </button>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition-colors ${
              canUndo
                ? 'text-white/70 hover:text-white hover:bg-white/10 cursor-pointer'
                : 'text-white/20 cursor-not-allowed'
            }`}
            aria-label="Undo"
            title="Undo (Ctrl+Z / Cmd+Z)"
          >
            <Undo2 size={13} />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition-colors ${
              canRedo
                ? 'text-white/70 hover:text-white hover:bg-white/10 cursor-pointer'
                : 'text-white/20 cursor-not-allowed'
            }`}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y)"
          >
            <Redo2 size={13} />
          </button>
        </div>

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
          <span className="hidden sm:inline">Swap Sides</span>
        </button>

        {/* Reset Pitch Background */}
        <button
          type="button"
          onClick={restoreDefaultPitch}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors cursor-pointer"
          title="Reset to default pitch background"
        >
          <RotateCcw size={13} className="text-emerald-400" />
          <span className="hidden sm:inline">Reset Pitch</span>
        </button>

        {/* Custom Background Image Upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors cursor-pointer"
          title="Upload custom background image"
        >
          <ImagePlus size={13} className="text-emerald-400" />
          <span className="hidden sm:inline">Background</span>
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
            <div className="absolute left-0 top-full mt-1 w-72 rounded-xl bg-[#18181b] border border-white/15 shadow-2xl py-1.5 z-50 overflow-hidden">
              <div className="px-3 py-1 text-[10px] uppercase font-semibold tracking-wider text-white/40">
                Benchmark Scenarios
              </div>
              <button
                type="button"
                onClick={handleLoadTenSlides}
                className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 text-white transition-colors cursor-pointer flex flex-col gap-0.5 border-b border-white/5"
              >
                <div className="flex items-center gap-1.5 font-medium text-emerald-300">
                  <Sparkles size={12} />
                  <span>10-Slide Full Progression (16s)</span>
                </div>
                <span className="text-[10px] text-white/50">
                  10 Slides • 984 frames benchmark (Build-up to Goal)
                </span>
              </button>
              <button
                type="button"
                onClick={handleLoadSixSlides}
                className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 text-white transition-colors cursor-pointer flex flex-col gap-0.5 border-b border-white/5"
              >
                <div className="flex items-center gap-1.5 font-medium text-blue-300">
                  <Sparkles size={12} />
                  <span>6-Slide Overload & Cutback (9.6s)</span>
                </div>
                <span className="text-[10px] text-white/50">
                  6 Slides • 576 frames benchmark (Mid-Range)
                </span>
              </button>
              <button
                type="button"
                onClick={handleLoadLowBlock}
                className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 text-white transition-colors cursor-pointer flex flex-col gap-0.5 border-b border-white/5"
              >
                <div className="flex items-center gap-1.5 font-medium text-purple-300">
                  <Sparkles size={12} />
                  <span>Low Block Penetration (3.8s)</span>
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
                  <span>High Press vs Build-up (1.8s)</span>
                </div>
                <span className="text-[10px] text-white/50">
                  2 Slides • Pressing trap bait & turnover
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center: Team Visibility & Aspect Ratio */}
      <div className="flex items-center gap-2">
        {/* Team Visibility Quick Filter (Both / Home / Away) */}
        <div className="flex items-center bg-white/5 rounded-md border border-white/10 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setTeamVisibility('both')}
            className={`px-2 py-0.5 rounded transition-colors text-[11px] font-medium cursor-pointer ${
              teamVisibility === 'both'
                ? 'bg-white/20 text-white font-semibold shadow-xs'
                : 'text-white/50 hover:text-white/80'
            }`}
            title="Show both teams"
          >
            Both
          </button>
          <button
            type="button"
            onClick={() => setTeamVisibility('home')}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors text-[11px] font-medium cursor-pointer ${
              teamVisibility === 'home'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-white/50 hover:text-white/80'
            }`}
            title="Show Home team only"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: homeColor }}
            />
            <span>Home</span>
          </button>
          <button
            type="button"
            onClick={() => setTeamVisibility('away')}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors text-[11px] font-medium cursor-pointer ${
              teamVisibility === 'away'
                ? 'bg-red-600 text-white font-semibold shadow-xs'
                : 'text-white/50 hover:text-white/80'
            }`}
            title="Show Away team only"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: awayColor }}
            />
            <span>Away</span>
          </button>
        </div>

        {/* Aspect Ratio */}
        <button
          type="button"
          onClick={() => setAspectRatio(nextRatio)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/80 hover:text-white transition-colors cursor-pointer"
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
          {!isImageBackground && (
            <>
              <button
                type="button"
                onClick={() => setRightPanelTab('formation')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  rightPanelTab === 'formation'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                title="Formation Panel"
                aria-label="Formation Panel"
              >
                <Shield size={14} />
              </button>

              <button
                type="button"
                onClick={() => setRightPanelTab('squad')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  rightPanelTab === 'squad'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                title="Squad & Bench Panel"
                aria-label="Squad & Bench Panel"
              >
                <Users size={14} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setRightPanelTab('inspector')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              rightPanelTab === 'inspector' || isImageBackground
                ? 'bg-blue-600 text-white shadow'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Properties & Slide Settings Panel"
            aria-label="Properties & Slide Settings Panel"
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
