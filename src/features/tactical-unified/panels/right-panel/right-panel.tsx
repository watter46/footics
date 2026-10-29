'use client';

/**
 * right-panel.tsx
 * Persistent Figma-like Right Panel (Width: 400px)
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
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { DEFAULT_PITCH_APPEARANCE } from '@/lib/types/tactical-unified';
import { FormationPanel } from './formation-panel';
import { PitchAppearancePanel } from './pitch-appearance-panel';
import { SquadSubPanel } from './squad-sub-panel';

export function RightPanel() {
  const rightPanelTab = useTacticalUnifiedStoreContext(
    (s) => s.panels.rightPanelTab,
  );
  const setRightPanelTab = useTacticalUnifiedStoreContext(
    (s) => s.setRightPanelTab,
  );
  const isRightPanelOpen = useTacticalUnifiedStoreContext(
    (s) => s.panels.isRightPanelOpen,
  );
  const toggleRightPanel = useTacticalUnifiedStoreContext(
    (s) => s.toggleRightPanel,
  );
  const setRightPanelOpen = useTacticalUnifiedStoreContext(
    (s) => s.setRightPanelOpen,
  );
  const pitchAppearance = useTacticalUnifiedStoreContext(
    (s) => s.project.pitchAppearance ?? DEFAULT_PITCH_APPEARANCE,
  );
  const updatePitchAppearance = useTacticalUnifiedStoreContext(
    (s) => s.updatePitchAppearance,
  );

  const handleTabClick = (tab: 'formation' | 'squad' | 'pitch') => {
    setRightPanelTab(tab);
    if (!isRightPanelOpen) {
      setRightPanelOpen(true);
    }
  };

  return (
    <aside
      className={`h-full bg-[#121214] border-l border-white/[0.08] flex flex-col shrink-0 z-30 overflow-hidden transition-[width] duration-200 ease-in-out ${
        isRightPanelOpen ? 'w-[400px] min-w-[400px]' : 'w-12 min-w-[48px]'
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

          <button
            type="button"
            onClick={() => handleTabClick('formation')}
            className={`p-2 rounded-md transition-colors cursor-pointer relative ${
              rightPanelTab === 'formation'
                ? 'bg-[#FF8100]/24 text-[#FFA336] border border-[#FF8100]/80 ring-1 ring-[#FF8100]/40 shadow-[0_0_14px_rgba(255,129,0,0.5)]'
                : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
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
                ? 'bg-[#FF8100]/24 text-[#FFA336] border border-[#FF8100]/80 ring-1 ring-[#FF8100]/40 shadow-[0_0_14px_rgba(255,129,0,0.5)]'
                : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
            title="Squad & Bench Management"
            aria-label="Squad"
          >
            <Users size={16} />
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('pitch')}
            className={`p-2 rounded-md transition-colors cursor-pointer relative ${
              rightPanelTab === 'pitch'
                ? 'bg-[#FF8100]/24 text-[#FFA336] border border-[#FF8100]/80 ring-1 ring-[#FF8100]/40 shadow-[0_0_14px_rgba(255,129,0,0.5)]'
                : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
            title="Pitch Appearance"
            aria-label="Pitch"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      ) : (
        // ── 展開状態 (400px 詳細パネル) ──
        <>
          {/* Top Segmented Tab Switcher (3タブ体制) + Close Button */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[#0D0D0E] border-b border-white/[0.08] shrink-0">
            <SegmentedControl
              className="flex-1 [&>button]:flex-1"
              value={rightPanelTab}
              onChange={(tab) =>
                setRightPanelTab(tab as 'formation' | 'squad' | 'pitch')
              }
              options={[
                { id: 'formation', label: 'Formation', icon: Shield },
                { id: 'squad', label: 'Squad', icon: Users },
                { id: 'pitch', label: 'Pitch', icon: SlidersHorizontal },
              ]}
            />

            {/* Collapse Button */}
            <IconButton
              onClick={toggleRightPanel}
              className="shrink-0"
              title="Collapse Panel"
              aria-label="Collapse Panel"
            >
              <ChevronRight size={16} />
            </IconButton>
          </div>

          {/* Tab Body */}
          <div className="flex-1 overflow-hidden">
            {rightPanelTab === 'formation' && <FormationPanel />}
            {rightPanelTab === 'squad' && <SquadSubPanel />}
            {rightPanelTab === 'pitch' && (
              <PitchAppearancePanel
                pitchAppearance={pitchAppearance}
                onUpdatePitchAppearance={updatePitchAppearance}
              />
            )}
          </div>
        </>
      )}
    </aside>
  );
}
