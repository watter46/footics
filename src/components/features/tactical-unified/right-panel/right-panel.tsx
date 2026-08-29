'use client';

/**
 * right-panel.tsx
 * Persistent Figma-like Right Panel
 *
 * Houses:
 *  - Formation & Sub-members management tab
 *  - Inspector / Properties tab
 */

import { SlidersHorizontal, Users } from 'lucide-react';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import { InspectorPanel } from '../inspector/inspector-panel';
import { FormationSubPanel } from './formation-sub-panel';

export function RightPanel() {
  const rightPanelTab = useTacticalUnifiedStore((s) => s.panels.rightPanelTab);
  const setRightPanelTab = useTacticalUnifiedStore((s) => s.setRightPanelTab);
  const selectedCount = useTacticalUnifiedStore(
    (s) => s.selectedObjects.length,
  );

  return (
    <aside className="w-[300px] min-w-[300px] h-full bg-[#141414] border-l border-white/10 flex flex-col shrink-0 z-30 overflow-hidden">
      {/* Top Segmented Tab Switcher */}
      <div className="flex items-center p-1.5 bg-[#111] border-b border-white/10 shrink-0">
        <div className="grid grid-cols-2 gap-1 w-full p-0.5 rounded-lg bg-white/5 border border-white/10">
          <button
            type="button"
            onClick={() => setRightPanelTab('formation_sub')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
              rightPanelTab === 'formation_sub'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={13} />
            <span>Formation & Squad</span>
          </button>

          <button
            type="button"
            onClick={() => setRightPanelTab('inspector')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
              rightPanelTab === 'inspector'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
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
        {rightPanelTab === 'formation_sub' ? (
          <FormationSubPanel />
        ) : (
          <InspectorPanel />
        )}
      </div>
    </aside>
  );
}
