import type { Event } from '@/lib/db';

export interface CategoryMeta {
  label: string;
  markerClassName: string;
}

export interface ResolvedHistoryEvent extends Event {
  actionName: string;
  categoryLabel: string;
  markerClassName: string;
  subjectLabel: string;
  memoSummary: string | null;
  isOpponent: boolean;
  positionLabel: string;
  playerSnapshotLabel: string | null;
}
