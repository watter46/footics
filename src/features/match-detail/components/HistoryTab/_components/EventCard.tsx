import { cn } from '@/lib/utils/cn';

import type { ResolvedHistoryEvent } from '../types';

interface HistoryEventCardProps {
  event: ResolvedHistoryEvent;
  align: 'left' | 'right';
}

export const HistoryEventCard = ({ event, align }: HistoryEventCardProps) => {
  const isLeft = align === 'left';

  const leftCard = (
    <div
      className={cn(
        'w-full max-w-68 rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-3 shadow-sm transition md:ml-auto'
      )}
    >
      <div className="flex flex-col items-end gap-3 text-right">
        <div className="flex items-center justify-end gap-2 text-sm font-semibold text-slate-100">
          <span>{event.matchTime}</span>
          <span
            aria-hidden="true"
            className={cn(
              'flex h-3 w-3 items-center justify-center rounded-full text-xs leading-none',
              event.markerClassName
            )}
          >
            ●
          </span>
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
        <span className="text-[11px] tracking-wide text-slate-500 uppercase">
          {event.categoryLabel}
        </span>
      </div>
    </div>
  );

  const rightCard = (
    <div
      className={cn(
        'w-full max-w-68 rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-3 shadow-sm transition md:mr-auto'
      )}
    >
      <div className="flex flex-col items-start gap-3 text-left">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <span>{event.matchTime}</span>
          <span
            aria-hidden="true"
            className={cn(
              'flex h-3 w-3 items-center justify-center rounded-full text-xs leading-none',
              event.markerClassName
            )}
          >
            ●
          </span>
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
        <span className="text-[11px] tracking-wide text-slate-500 uppercase">
          {event.categoryLabel}
        </span>
      </div>
    </div>
  );

  return isLeft ? leftCard : rightCard;
};
