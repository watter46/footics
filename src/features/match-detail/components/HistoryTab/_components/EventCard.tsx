import { useCallback } from 'react';
import type { ComponentType } from 'react';

import { cn } from '@/lib/utils/cn';
import { useEditEventStore } from '@/features/match-detail/stores/edit-event-store';

import type { ResolvedHistoryEvent } from '../types';

interface HistoryEventCardProps {
  event: ResolvedHistoryEvent;
  align: 'left' | 'right';
  icon: ComponentType<{ className?: string }>;
}

export const HistoryEventCard = ({ event, align, icon: Icon }: HistoryEventCardProps) => {
  const isLeft = align === 'left';
  const openEditSheet = useEditEventStore(state => state.openEditSheet);
  const ariaLabel = event.actionName ? `${event.actionName}を編集` : 'イベントを編集';

  const handleOpenEdit = useCallback(() => {
    if (typeof event.id === 'number') {
      openEditSheet(event.id);
    }
  }, [event.id, openEditSheet]);

  const leftCard = (
    <button
      type="button"
      className={cn(
        'w-full max-w-68 rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-3 text-left shadow-sm transition hover:bg-slate-900/60 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 focus:outline-none md:ml-auto'
      )}
      onClick={handleOpenEdit}
      aria-label={ariaLabel}
    >
      <div className="flex flex-col items-end gap-3 text-right">
        <div className="flex items-center justify-end gap-2 text-sm font-semibold text-slate-100">
          <span>{event.matchTime}</span>
          <Icon
            aria-hidden="true"
            className={cn('h-4 w-4', event.markerClassName)}
          />
          <span>{event.actionName}</span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-xs text-slate-300">
          <span className="text-sm font-semibold text-slate-100">
            {event.positionLabel}
          </span>
          {event.playerSnapshotLabel ? (
            <span className="text-xs text-slate-300">
              [{event.playerSnapshotLabel}]
            </span>
          ) : event.subjectLabel && event.subjectLabel !== event.positionLabel ? (
            <span className="text-xs text-slate-400">{event.subjectLabel}</span>
          ) : null}
        </div>
        {event.memoSummary ? (
          <p className="text-xs leading-relaxed text-slate-400">{event.memoSummary}</p>
        ) : null}
      </div>
    </button>
  );

  const rightCard = (
    <button
      type="button"
      className={cn(
        'w-full max-w-68 rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-3 text-left shadow-sm transition hover:bg-slate-900/60 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 focus:outline-none md:mr-auto'
      )}
      onClick={handleOpenEdit}
      aria-label={ariaLabel}
    >
      <div className="flex flex-col items-start gap-3 text-left">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <span>{event.matchTime}</span>
          <Icon
            aria-hidden="true"
            className={cn('h-4 w-4', event.markerClassName)}
          />
          <span>{event.actionName}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-300">
          <span className="text-sm font-semibold text-slate-100">
            {event.positionLabel}
          </span>
          {event.playerSnapshotLabel ? (
            <span className="text-xs text-slate-300">
              [{event.playerSnapshotLabel}]
            </span>
          ) : event.subjectLabel && event.subjectLabel !== event.positionLabel ? (
            <span className="text-xs text-slate-400">{event.subjectLabel}</span>
          ) : null}
        </div>
        {event.memoSummary ? (
          <p className="text-xs leading-relaxed text-slate-400">{event.memoSummary}</p>
        ) : null}
      </div>
    </button>
  );

  return isLeft ? leftCard : rightCard;
};
