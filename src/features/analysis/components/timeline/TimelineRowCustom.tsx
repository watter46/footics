'use client';

import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { Badge } from '@/components/ui/badge';
import { getEventMetadata } from '@/lib/event-definitions';
import { formatTimelineTime } from '@/lib/timeline-utils';
import type { EventRow } from '@/types';

export interface TimelineRowCustomProps {
  event: EventRow;
  index: number;
  virtualRow: {
    size: number;
    start: number;
  };
  matchId: string;
  isHighlighted?: boolean;
  onEdit?: (event: EventRow) => void;
  onDelete?: (eventId: string) => void;
}

export const TimelineRowCustom: React.FC<TimelineRowCustomProps> = ({
  event,
  index,
  virtualRow,
  matchId,
  isHighlighted,
  onEdit,
  onDelete,
}) => {
  const timeString = formatTimelineTime(event);
  const tacticalMinute = Math.floor(event.minute ?? 0);
  const tacticalUrl = `/tactical?matchId=${encodeURIComponent(matchId)}&minute=${tacticalMinute}`;

  return (
    <div
      data-index={index}
      className={`group flex items-center px-4 border-b border-amber-900/30 transition-colors ${
        isHighlighted
          ? 'bg-amber-700/50 blink-shadow'
          : 'bg-amber-950/20 hover:bg-amber-900/30'
      }`}
      style={{ height: `${virtualRow.size}px` }}
    >
      <div className="w-28 font-mono text-amber-500/80 text-sm">
        {timeString}
      </div>
      <div className="flex-1 flex items-center gap-2 pr-4 overflow-hidden">
        <div className="flex gap-1 flex-wrap shrink-0">
          {(event.custom_label || '')
            .split(' / ')
            .filter(Boolean)
            .map((lbl) => {
              const meta = getEventMetadata(lbl);
              return (
                <Badge
                  key={lbl}
                  className="border font-bold px-2 py-0.5 rounded shadow-none text-[10px] uppercase tracking-wider whitespace-nowrap text-white"
                  style={{
                    backgroundColor: `${meta?.groupColor ?? '#8E8E93'}33`,
                    borderColor: meta?.groupColor ?? '#8E8E93',
                    color: meta?.groupColor ?? '#ffffff',
                  }}
                >
                  {lbl}
                </Badge>
              );
            })}
        </div>
        <span className="text-amber-100/90 text-sm font-medium leading-relaxed truncate">
          {event.custom_memo}
        </span>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 pr-2 sm:pr-4 shrink-0">
        <Link
          href={tacticalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 sm:p-1.5 text-amber-500/70 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
          title={`Tactical戦術ボードを開く (${tacticalMinute}分)`}
          aria-label={`Open in Tactical at minute ${tacticalMinute}`}
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
        <button
          type="button"
          onClick={() => onEdit?.(event)}
          className="p-2 sm:p-1.5 text-amber-500/70 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
          title="Edit Event"
          aria-label="Edit Event"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete?.(event.id.toString())}
          className="p-2 sm:p-1.5 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Delete Event"
          aria-label="Delete Event"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
