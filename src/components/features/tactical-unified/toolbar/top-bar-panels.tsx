'use client';

import { Shield, SlidersHorizontal, Users } from 'lucide-react';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';

export function TopBarPanels() {
  const rightPanelTab = useTacticalUnifiedStore((s) => s.panels.rightPanelTab);
  const isRightPanelOpen = useTacticalUnifiedStore(
    (s) => s.panels.isRightPanelOpen,
  );
  const setRightPanelTab = useTacticalUnifiedStore((s) => s.setRightPanelTab);
  const toggleRightPanel = useTacticalUnifiedStore((s) => s.toggleRightPanel);
  const setRightPanelOpen = useTacticalUnifiedStore((s) => s.setRightPanelOpen);
  const isImageBackground = useTacticalUnifiedStore(
    (s) => s.project.backgroundType === 'image',
  );

  return (
    <div className="flex items-center p-0.5 rounded-lg bg-white/5 border border-white/10 mr-1">
      {!isImageBackground && (
        <>
          <button
            type="button"
            onClick={() => {
              if (rightPanelTab === 'formation' && isRightPanelOpen) {
                toggleRightPanel();
              } else {
                setRightPanelTab('formation');
                setRightPanelOpen(true);
              }
            }}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              rightPanelTab === 'formation' && isRightPanelOpen
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
            onClick={() => {
              if (rightPanelTab === 'squad' && isRightPanelOpen) {
                toggleRightPanel();
              } else {
                setRightPanelTab('squad');
                setRightPanelOpen(true);
              }
            }}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              rightPanelTab === 'squad' && isRightPanelOpen
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
        onClick={() => {
          if (
            (rightPanelTab === 'inspector' || isImageBackground) &&
            isRightPanelOpen
          ) {
            toggleRightPanel();
          } else {
            setRightPanelTab('inspector');
            setRightPanelOpen(true);
          }
        }}
        className={`p-1.5 rounded transition-colors cursor-pointer ${
          (rightPanelTab === 'inspector' || isImageBackground) &&
          isRightPanelOpen
            ? 'bg-blue-600 text-white shadow'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title="Properties & Slide Settings Panel"
        aria-label="Properties & Slide Settings Panel"
      >
        <SlidersHorizontal size={14} />
      </button>
    </div>
  );
}
