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

import { ChevronLeft, ChevronRight, Shield, Users } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
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

  const handleTabClick = (tab: 'formation' | 'squad') => {
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
        </div>
      ) : (
        // ── 展開状態 (400px 詳細パネル) ──
        <>
          {/* Top Segmented Tab Switcher (2タブ体制) + Close Button */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[#0D0D0E] border-b border-white/[0.08] shrink-0">
            <SegmentedControl
              className="flex-1 [&>button]:flex-1"
              value={rightPanelTab === 'squad' ? 'squad' : 'formation'}
              onChange={setRightPanelTab}
              options={[
                { id: 'formation', label: 'Formation', icon: Shield },
                { id: 'squad', label: 'Squad', icon: Users },
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
            {rightPanelTab === 'formation' ? (
              <FormationPanel />
            ) : (
              <SquadSubPanel />
            )}
          </div>
        </>
      )}
    </aside>
  );
}
