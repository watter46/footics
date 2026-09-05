'use client';

import type React from 'react';
import type { EventStrategy } from '@/registry/event-strategy';
import type { EventRow, Match } from '@/types';
import { TimelineRowCustom } from './TimelineRowCustom';
import { TimelineRowStandard } from './TimelineRowStandard';

export interface TimelineRowProps {
  event: EventRow;
  index: number;
  virtualRow: {
    size: number;
    start: number;
  };
  metadata: Match;
  activeStrategyList: EventStrategy[];
  activeStrategyParams: Record<string, Record<string, unknown>>;
  highlightEventId?: string | null;
  onEdit?: (event: EventRow) => void;
  onDelete?: (eventId: string) => void;
}

export const TimelineRow: React.FC<TimelineRowProps> = ({
  event,
  index,
  virtualRow,
  metadata,
  activeStrategyList,
  activeStrategyParams,
  highlightEventId,
  onEdit,
  onDelete,
}) => {
  if (event.source === 'custom') {
    const isHighlighted = highlightEventId === event.id.toString();
    return (
      <TimelineRowCustom
        event={event}
        index={index}
        virtualRow={virtualRow}
        matchId={metadata.id}
        isHighlighted={isHighlighted}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  return (
    <TimelineRowStandard
      event={event}
      index={index}
      virtualRow={virtualRow}
      metadata={metadata}
      activeStrategyList={activeStrategyList}
      activeStrategyParams={activeStrategyParams}
    />
  );
};
