import type { Match } from '@/types';

export interface TeamSummaryHeaderProps {
  metadata: Match;
  activeFilterCount: number;
  matchId: string;
  onOpenSidebar: () => void;
  onAddEvent: () => void;
  onRefreshCustomEvents: () => void;
}
