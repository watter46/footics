'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDownUp } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { eventStrategies } from '@/registry';
import type { EventRow, Match } from '@/types';
import { TimelineHeader } from '../timeline/TimelineHeader';
import { TimelineRow } from '../timeline/TimelineRow';
import { MatchMemoDisplay } from './MatchMemoDisplay';

interface EventTimelineProps {
  events: EventRow[];
  totalCount: number;
  isQuerying: boolean;
  metadata: Match;
  activeStrategies: Set<string>;
  activeStrategyParams: Record<string, Record<string, unknown>>;
  highlightEventId?: string | null;
  onEditCustomEvent?: (event: EventRow) => void;
  onDeleteCustomEvent?: (eventId: string) => void;
  onEditMatchMemo?: () => void;
}

type SortOrder = 'asc' | 'desc';

export function EventTimeline({
  events,
  totalCount,
  isQuerying,
  metadata,
  activeStrategies,
  activeStrategyParams,
  highlightEventId,
  onEditCustomEvent,
  onDeleteCustomEvent,
  onEditMatchMemo,
}: EventTimelineProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const sortedEvents = useMemo(() => {
    return sortOrder === 'desc' ? [...events].reverse() : events;
  }, [events, sortOrder]);

  const activeStrategyList = useMemo(
    () => eventStrategies.filter((s) => activeStrategies.has(s.id)),
    [activeStrategies],
  );

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: sortedEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 10,
  });

  return (
    <div className="flex-1 flex flex-col relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-slate-950 to-emerald-900/10 pointer-events-none" />

      {/* Match Memo Display */}
      <MatchMemoDisplay matchId={metadata.id} onEdit={onEditMatchMemo} />

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

        {/* Sort Order Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
          className="flex items-center gap-1.5 border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          title={sortOrder === 'asc' ? '昇順（古い順）' : '降順（新しい順）'}
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">
            {sortOrder === 'asc' ? '昇順' : '降順'}
          </span>
        </Button>
      </header>

      {/* Table Container */}
      <Card className="flex-1 flex flex-col bg-slate-900/80 border-slate-800 backdrop-blur-xl relative z-10 shadow-2xl overflow-hidden">
        <CardContent className="p-0 flex-1 flex flex-col min-h-0">
          <TimelineHeader />

          {sortedEvents.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-slate-500">
              No events found for given filters.
            </div>
          ) : (
            <div ref={parentRef} className="w-full flex-1 overflow-y-auto">
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const event = sortedEvents[virtualRow.index];
                  return (
                    <div
                      key={event.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <TimelineRow
                        event={event}
                        index={virtualRow.index}
                        virtualRow={{
                          size: virtualRow.size,
                          start: virtualRow.start,
                        }}
                        metadata={metadata}
                        activeStrategyList={activeStrategyList}
                        activeStrategyParams={activeStrategyParams}
                        highlightEventId={highlightEventId}
                        onEdit={onEditCustomEvent}
                        onDelete={onDeleteCustomEvent}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
