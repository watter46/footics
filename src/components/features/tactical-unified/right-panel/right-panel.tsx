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

import { Shield, SlidersHorizontal, Users } from 'lucide-react';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import { InspectorPanel } from '../inspector/inspector-panel';
import { FormationPanel } from './formation-panel';
import { SquadSubPanel } from './squad-sub-panel';

export function RightPanel() {
  const rightPanelTab = useTacticalUnifiedStore((s) => s.panels.rightPanelTab);
  const setRightPanelTab = useTacticalUnifiedStore((s) => s.setRightPanelTab);
  const selectedCount = useTacticalUnifiedStore(
    (s) => s.selectedObjects.length,
  );

  return (
    <aside className="w-[340px] min-w-[340px] h-full bg-[#141414] border-l border-white/10 flex flex-col shrink-0 z-30 overflow-hidden">
      {/* Top Segmented Tab Switcher */}
      <div className="flex items-center p-1.5 bg-[#111] border-b border-white/10 shrink-0">
        <div className="grid grid-cols-3 gap-1 w-full p-0.5 rounded-lg bg-white/5 border border-white/10">
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
            title="Properties & Slide Settings"
          >
            <SlidersHorizontal size={13} />
            <span>Properties</span>
            {selectedCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                {selectedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-hidden">
        {rightPanelTab === 'formation' && <FormationPanel />}
        {rightPanelTab === 'squad' && <SquadSubPanel />}
        {rightPanelTab === 'inspector' && <InspectorPanel />}
      </div>
    </aside>
  );
}
