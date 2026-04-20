'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { eventStrategies } from '@/registry';
import type { EventRow, MatchMetadata } from '@/types';
import { TimelineHeader } from '../Timeline/TimelineHeader';
import { TimelineRow } from '../Timeline/TimelineRow';

interface EventTimelineProps {
  events: EventRow[];
  totalCount: number;
  isQuerying: boolean;
  metadata: MatchMetadata;
  activeStrategies: Set<string>;
  highlightEventId?: string | null;
  onEditCustomEvent?: (event: EventRow) => void;
  onDeleteCustomEvent?: (eventId: string) => void;
}

const ROW_HEIGHT = 44;
const OVERSCAN = 15;

export function EventTimeline({
  events,
  totalCount,
  isQuerying,
  metadata,
  activeStrategies,
  highlightEventId,
  onEditCustomEvent,
  onDeleteCustomEvent,
}: EventTimelineProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  useEffect(() => {
    if (highlightEventId && events.length > 0) {
      const idx = events.findIndex((e) => e.id.toString() === highlightEventId);
      if (idx !== -1) {
        setTimeout(() => {
          virtualizer.scrollToIndex(idx, { align: 'center' });
        }, 50);
      }
    }
  }, [highlightEventId, events, virtualizer]);

  const activeStrategyList = useMemo(
    () => eventStrategies.filter((s) => activeStrategies.has(s.id)),
    [activeStrategies],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-slate-950 to-emerald-900/10 pointer-events-none" />

      {/* Header Info */}
      <header className="mb-6 relative z-10 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-white mb-1">
            Event Timeline
          </h2>
          <p className="text-slate-400 text-sm">
            {isQuerying ? (
              <span className="text-blue-400 animate-pulse">Querying...</span>
            ) : (
              `Showing ${events.length} of ${totalCount} events`
            )}
          </p>
        </div>
      </header>

      {/* Table Container */}
      <Card className="flex-1 flex flex-col overflow-hidden bg-slate-900/80 border-slate-800 backdrop-blur-xl relative z-10 shadow-2xl">
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
          <TimelineHeader />

          {/* Virtual scroll container */}
          <div ref={parentRef} className="flex-1 overflow-y-auto">
            {events.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-500">
                No events found for given filters.
              </div>
            ) : (
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => (
                  <TimelineRow
                    key={events[virtualRow.index].id}
                    event={events[virtualRow.index]}
                    index={virtualRow.index}
                    virtualRow={virtualRow}
                    metadata={metadata}
                    activeStrategyList={activeStrategyList}
                    highlightEventId={highlightEventId}
                    onEdit={onEditCustomEvent}
                    onDelete={onDeleteCustomEvent}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
