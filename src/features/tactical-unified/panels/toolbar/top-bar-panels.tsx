'use client';

import { Shield, Users } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';

export function TopBarPanels() {
  const rightPanelTab = useTacticalUnifiedStore((s) => s.panels.rightPanelTab);
  const isRightPanelOpen = useTacticalUnifiedStore(
    (s) => s.panels.isRightPanelOpen,
  );
  const setRightPanelTab = useTacticalUnifiedStore((s) => s.setRightPanelTab);
  const toggleRightPanel = useTacticalUnifiedStore((s) => s.toggleRightPanel);
  const setRightPanelOpen = useTacticalUnifiedStore((s) => s.setRightPanelOpen);

  const isFormationActive = rightPanelTab === 'formation' && isRightPanelOpen;
  const isSquadActive = rightPanelTab === 'squad' && isRightPanelOpen;

  return (
    <div className="flex items-center p-0.5 rounded-[8px] bg-[#0D0D0E] border border-white/[0.07] mr-1 gap-0.5">
      <IconButton
        variant="ghost"
        size="xs"
        isActive={isFormationActive}
        onClick={() => {
          if (rightPanelTab === 'formation' && isRightPanelOpen) {
            toggleRightPanel();
          } else {
            setRightPanelTab('formation');
            setRightPanelOpen(true);
          }
        }}
        title="Formation Panel"
        aria-label="Formation Panel"
      >
        <Shield size={14} strokeWidth={1.5} />
      </IconButton>

      <IconButton
        variant="ghost"
        size="xs"
        isActive={isSquadActive}
        onClick={() => {
          if (rightPanelTab === 'squad' && isRightPanelOpen) {
            toggleRightPanel();
          } else {
            setRightPanelTab('squad');
            setRightPanelOpen(true);
          }
        }}
        title="Squad & Bench Panel"
        aria-label="Squad & Bench Panel"
      >
        <Users size={14} strokeWidth={1.5} />
      </IconButton>
    </div>
  );
}
