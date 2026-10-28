'use client';

import { Shield, Users } from 'lucide-react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';

export function TopBarPanels() {
  const rightPanelTab = useTacticalUnifiedStore((s) => s.panels.rightPanelTab);
  const isRightPanelOpen = useTacticalUnifiedStore(
    (s) => s.panels.isRightPanelOpen,
  );
  const setRightPanelTab = useTacticalUnifiedStore((s) => s.setRightPanelTab);
  const toggleRightPanel = useTacticalUnifiedStore((s) => s.toggleRightPanel);
  const setRightPanelOpen = useTacticalUnifiedStore((s) => s.setRightPanelOpen);

  return (
    <div className="flex items-center p-0.5 rounded-[8px] bg-[#0D0D0E] border border-white/[0.07] mr-1 gap-0.5">
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
        className={`p-1.5 rounded-[6px] transition-all cursor-pointer ${
          rightPanelTab === 'formation' && isRightPanelOpen
            ? 'bg-[#FF5500]/15 text-[#FF5500] border border-[#FF5500]/30 shadow-[0_0_10px_rgba(255,85,0,0.25)]'
            : 'text-[#A1A1AA] hover:text-white hover:bg-white/[0.04] border border-transparent'
        }`}
        title="Formation Panel"
        aria-label="Formation Panel"
      >
        <Shield size={14} strokeWidth={1.5} />
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
        className={`p-1.5 rounded-[6px] transition-all cursor-pointer ${
          rightPanelTab === 'squad' && isRightPanelOpen
            ? 'bg-[#FF5500]/15 text-[#FF5500] border border-[#FF5500]/30 shadow-[0_0_10px_rgba(255,85,0,0.25)]'
            : 'text-[#A1A1AA] hover:text-white hover:bg-white/[0.04] border border-transparent'
        }`}
        title="Squad & Bench Panel"
        aria-label="Squad & Bench Panel"
      >
        <Users size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}
