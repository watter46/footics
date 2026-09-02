'use client';

/**
 * right-panel.tsx
 * Persistent Figma-like Right Panel (Width: 340px)
 *
 * Houses:
 *  - Formation Presets Tab (Shield)
 *  - Squad & Bench Tab (Users)
 *  - Inspector / Properties Tab (SlidersHorizontal)
 */

import {
  ChevronLeft,
  ChevronRight,
  Shield,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';
import { InspectorPanel } from '../inspector/inspector-panel';
import { FormationPanel } from './formation-panel';
import { SquadSubPanel } from './squad-sub-panel';

export function RightPanel() {
  const rightPanelTab = useTacticalUnifiedStore((s) => s.panels.rightPanelTab);
  const setRightPanelTab = useTacticalUnifiedStore((s) => s.setRightPanelTab);
  const isRightPanelOpen = useTacticalUnifiedStore(
    (s) => s.panels.isRightPanelOpen,
  );
  const toggleRightPanel = useTacticalUnifiedStore((s) => s.toggleRightPanel);
  const setRightPanelOpen = useTacticalUnifiedStore((s) => s.setRightPanelOpen);
  const isImageBackground = useTacticalUnifiedStore(
    (s) => s.project.backgroundType === 'image',
  );
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const selectedCount = selectedObjects.length;
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);

  const selectedRing =
    selectedObjects.length === 1 && selectedObjects[0].kind === 'player'
      ? activeSlide?.players.find(
          (p) =>
            p.id === selectedObjects[0].id && p.style.markerType === 'ring',
        )
      : null;

  const isRingContext = Boolean(selectedRing) || isImageBackground;

  const handleTabClick = (tab: 'formation' | 'squad' | 'inspector') => {
    setRightPanelTab(tab);
    if (!isRightPanelOpen) {
      setRightPanelOpen(true);
    }
  };

  return (
    <aside
      className={`h-full bg-[#141414] border-l border-white/10 flex flex-col shrink-0 z-30 overflow-hidden transition-[width] duration-200 ease-in-out ${
        isRightPanelOpen ? 'w-[340px] min-w-[340px]' : 'w-12 min-w-[48px]'
      }`}
    >
      {!isRightPanelOpen ? (
        // ── 折りたたみ状態 (48px ミニマル・アイコンレール) ──
        <div className="flex flex-col items-center py-2 h-full gap-2">
          <button
            type="button"
            onClick={toggleRightPanel}
            className="p-2 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Expand Panel"
            aria-label="Expand Panel"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="w-6 h-px bg-white/10 my-1" />

          {!isImageBackground && (
            <>
              <button
                type="button"
                onClick={() => handleTabClick('formation')}
                className={`p-2 rounded-md transition-colors cursor-pointer relative ${
                  rightPanelTab === 'formation'
                    ? 'bg-blue-600/30 text-blue-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title="Formation Presets"
                aria-label="Formation"
              >
                <Shield size={16} />
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('squad')}
                className={`p-2 rounded-md transition-colors cursor-pointer relative ${
                  rightPanelTab === 'squad'
                    ? 'bg-blue-600/30 text-blue-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title="Squad & Bench Management"
                aria-label="Squad"
              >
                <Users size={16} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => handleTabClick('inspector')}
            className={`p-2 rounded-md transition-colors cursor-pointer relative ${
              rightPanelTab === 'inspector' || isImageBackground
                ? 'bg-blue-600/30 text-blue-400'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title={
              isRingContext
                ? 'Ring & Slide Settings'
                : 'Properties & Slide Settings'
            }
            aria-label={isRingContext ? 'Ring' : 'Properties'}
          >
            <SlidersHorizontal size={16} />
            {selectedCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
            )}
          </button>
        </div>
      ) : (
        // ── 展開状態 (340px 詳細パネル) ──
        <>
          {/* Top Segmented Tab Switcher + Close Button */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[#111] border-b border-white/10 shrink-0">
            {isImageBackground ? (
              // スクリーンショット/画像背景モード時: Ring / Properties 専用モード（Formation/Squad を非表示）
              <div className="flex items-center justify-between flex-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
                  <SlidersHorizontal size={14} className="text-blue-400" />
                  <span>Ring & Annotations</span>
                </div>
                {selectedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-xs">
                    {selectedCount} Selected
                  </span>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 flex-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setRightPanelTab('formation')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    rightPanelTab === 'formation'
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                  title="Formation Presets"
                >
                  <Shield size={13} />
                  <span>Formation</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRightPanelTab('squad')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    rightPanelTab === 'squad'
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                  title="Squad & Bench Management"
                >
                  <Users size={13} />
                  <span>Squad</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRightPanelTab('inspector')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    rightPanelTab === 'inspector'
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                  title={
                    isRingContext
                      ? 'Ring & Slide Settings'
                      : 'Properties & Slide Settings'
                  }
                >
                  <SlidersHorizontal size={13} />
                  <span>{isRingContext ? 'Ring' : 'Properties'}</span>
                  {selectedCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                      {selectedCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Collapse Button */}
            <button
              type="button"
              onClick={toggleRightPanel}
              className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Collapse Panel"
              aria-label="Collapse Panel"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Tab Body */}
          <div className="flex-1 overflow-hidden">
            {isImageBackground ? (
              <InspectorPanel />
            ) : (
              <>
                {rightPanelTab === 'formation' && <FormationPanel />}
                {rightPanelTab === 'squad' && <SquadSubPanel />}
                {rightPanelTab === 'inspector' && <InspectorPanel />}
              </>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
