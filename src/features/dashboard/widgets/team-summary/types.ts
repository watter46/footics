import type { ReactNode } from 'react';
import type { Match } from '@/types';

export interface TeamSummaryHeaderProps {
  metadata: Match;
  activeFilterCount: number;
  onOpenSidebar: () => void;
  onAddEvent: () => void;
  actionSlot?: ReactNode;
}
