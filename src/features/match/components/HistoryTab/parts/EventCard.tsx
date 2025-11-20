import { useCallback } from 'react';
import type { ComponentType } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils/cn';
import { useEditEventStore } from '@/features/match/hooks/useEditEventStore';
import { Separator } from '@/components/ui/separator';

import type { ResolvedHistoryEvent } from '../types';

interface HistoryEventCardProps {
  event: ResolvedHistoryEvent;
  align: 'left' | 'right';
  icon: ComponentType<{ className?: string }>;
}

export const HistoryEventCard = ({ event, align, icon: Icon }: HistoryEventCardProps) => {
  const isLeft = align === 'left';
  const isSubstitution = event.actionName === '交代';
  const openEditSheet = useEditEventStore(state => state.openEditSheet);
  const ariaLabel = event.actionName ? `${event.actionName}を編集` : 'イベントを編集';

  const handleOpenEdit = useCallback(() => {
    if (typeof event.id === 'number') {
      openEditSheet(event.id);
    }
  }, [event.id, openEditSheet]);

  const renderStandardDetails = (textAlign: 'left' | 'right') => (
    <div
      className={cn(
        'text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs',
        textAlign === 'left' ? 'justify-end text-right' : 'text-left'
      )}
    >
      <span className="text-foreground text-sm font-semibold">
        {event.positionLabel}
      </span>
      {event.playerSnapshotLabel ? (
        <span className="text-muted-foreground text-xs">
          [{event.playerSnapshotLabel}]
        </span>
      ) : event.subjectLabel && event.subjectLabel !== event.positionLabel ? (
        <span className="text-muted-foreground text-xs">{event.subjectLabel}</span>
      ) : null}
    </div>
  );

  const leftCard = (
    <motion.button
      type="button"
      className={cn(
        'bg-card/50 hover:border-primary/50 hover:bg-primary/10 focus:ring-primary/60 focus:ring-offset-background w-full max-w-68 rounded-2xl border border-white/10 px-4 py-3 text-left shadow-[0_0_25px_rgb(0_0_0/0.45)] transition focus:ring-2 focus:ring-offset-2 focus:outline-none md:ml-auto'
      )}
      onClick={handleOpenEdit}
      aria-label={ariaLabel}
      layout
      initial={{ opacity: 0, x: -12, y: 8 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="flex flex-col items-end gap-3 text-right">
        <div className="text-foreground flex items-center justify-end gap-2 text-sm font-semibold">
          <span>{event.matchTime}</span>
          <Icon
            aria-hidden="true"
            className={cn('h-4 w-4', event.markerClassName)}
          />
          <span>{event.actionName}</span>
        </div>
        {isSubstitution ? (
          <>
            <Separator className="border-white/10" />
            <div className="space-y-1 text-right text-xs">
              {event.playerSnapshotLabel ? (
                <p className="font-semibold text-emerald-300">
                  {event.playerSnapshotLabel}
                </p>
              ) : null}
              {event.playerOutSnapshotLabel ? (
                <p className="font-semibold text-rose-300">
                  {event.playerOutSnapshotLabel}
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <>
            {renderStandardDetails('left')}
            {event.memoSummary ? (
              <p className="text-muted-foreground text-xs leading-relaxed">{event.memoSummary}</p>
            ) : null}
          </>
        )}
      </div>
    </motion.button>
  );

  const rightCard = (
    <motion.button
      type="button"
      className={cn(
        'bg-card/50 hover:border-primary/50 hover:bg-primary/10 focus:ring-primary/60 focus:ring-offset-background w-full max-w-68 rounded-2xl border border-white/10 px-4 py-3 text-left shadow-[0_0_25px_rgb(0_0_0/0.45)] transition focus:ring-2 focus:ring-offset-2 focus:outline-none md:mr-auto'
      )}
      onClick={handleOpenEdit}
      aria-label={ariaLabel}
      layout
      initial={{ opacity: 0, x: 12, y: 8 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="flex flex-col items-start gap-3 text-left">
        <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <span>{event.matchTime}</span>
          <Icon
            aria-hidden="true"
            className={cn('h-4 w-4', event.markerClassName)}
          />
          <span>{event.actionName}</span>
        </div>
        {isSubstitution ? (
          <>
            <Separator className="border-white/10" />
            <div className="space-y-1 text-left text-xs">
              {event.playerSnapshotLabel ? (
                <p className="font-semibold text-emerald-300">
                  {event.playerSnapshotLabel}
                </p>
              ) : null}
              {event.playerOutSnapshotLabel ? (
                <p className="font-semibold text-rose-300">
                  {event.playerOutSnapshotLabel}
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <>
            {renderStandardDetails('right')}
            {event.memoSummary ? (
              <p className="text-muted-foreground text-xs leading-relaxed">{event.memoSummary}</p>
            ) : null}
          </>
        )}
      </div>
    </motion.button>
  );

  return isLeft ? leftCard : rightCard;
};
