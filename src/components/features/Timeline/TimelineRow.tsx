'use client';

import { Pencil, Trash2 } from 'lucide-react';
import type React from 'react';
import { Badge } from '@/components/ui/badge';
import { getEventMetadata } from '@/lib/event-definitions';
import { formatTimelineTime } from '@/lib/timeline-utils';
import type { EventStrategy } from '@/registry/event-strategy';
import type { EventRow, MatchMetadata } from '@/types';

interface TimelineRowProps {
  event: EventRow;
  index: number;
  virtualRow: {
    size: number;
    start: number;
  };
  metadata: MatchMetadata;
  activeStrategyList: EventStrategy[];
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
  highlightEventId,
  onEdit,
  onDelete,
}) => {
  const { playerIdNameDictionary, teams } = metadata;
  const isHome = Number(event.team_id) === Number(teams.home.teamId);
  const timeString = formatTimelineTime(event);

  const matchedStrategies = activeStrategyList.filter(
    (s) => event[`is_strategy_${s.id.replace(/-/g, '_')}`] === true,
  );

  // Custom Event Mode
  if (event.source === 'custom') {
    const isHighlighted = highlightEventId === event.id.toString();

    return (
      <div
        data-index={index}
        className={`flex items-center px-4 border-b border-amber-900/30 transition-colors ${
          isHighlighted
            ? 'bg-amber-700/50 blink-shadow'
            : 'bg-amber-950/20 hover:bg-amber-900/30'
        }`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`,
        }}
      >
        <div className="w-28 font-mono text-amber-500/80 text-sm">
          {timeString}
        </div>
        <div className="flex-1 flex items-center gap-2 pr-10 overflow-hidden">
          <div className="flex gap-1 flex-wrap shrink-0">
            {(event.custom_label || '')
              .split(' / ')
              .filter(Boolean)
              .map((lbl, i) => {
                const meta = getEventMetadata(lbl);
                return (
                  <Badge
                    key={i}
                    className="border font-bold px-2 py-0.5 rounded shadow-none text-[10px] uppercase tracking-wider whitespace-nowrap text-white"
                    style={{
                      backgroundColor: (meta?.groupColor ?? '#8E8E93') + '33',
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
        <div className="flex items-center gap-2 pr-4 shrink-0">
          <button
            onClick={() => onEdit?.(event)}
            className="p-1.5 text-amber-500/50 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
            title="Edit Event"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete?.(event.id.toString())}
            className="p-1.5 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Delete Event"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // WhoScored Event Mode
  return (
    <div
      data-index={index}
      className="flex items-center px-4 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
      }}
    >
      {/* Time */}
      <div className="w-28 font-mono text-slate-300 text-sm">{timeString}</div>

      {/* Player */}
      <div
        className={`flex-1 font-medium text-sm truncate px-3 py-1 rounded-md transition-colors ${
          isHome
            ? 'bg-blue-500/10 text-blue-300 border border-blue-400/10'
            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/10'
        }`}
      >
        {(() => {
          if (!event.player_id)
            return <span className="opacity-50">Team Event</span>;
          const pidStr = String(event.player_id).split('.')[0];
          const name = playerIdNameDictionary[pidStr];
          return (
            name || <span className="opacity-50">Team Event ({pidStr})</span>
          );
        })()}
      </div>

      {/* Team */}
      <div className="w-32">
        <Badge
          variant="outline"
          className={`border-0 bg-opacity-15 font-semibold text-xs ${
            isHome
              ? 'bg-blue-500 text-blue-400'
              : 'bg-emerald-500 text-emerald-400'
          }`}
        >
          {isHome ? teams.home.name : teams.away.name}
        </Badge>
      </div>

      {/* Event Type */}
      <div className="w-40 text-sm">
        <span>{event.type_name}</span>
        {event.is_shot && (
          <Badge className="ml-1.5 bg-red-900/50 text-red-400 hover:bg-red-900/50 text-xs">
            Shot
          </Badge>
        )}
        {event.is_goal && (
          <Badge className="ml-1.5 bg-yellow-600 text-yellow-100 hover:bg-yellow-600 text-xs">
            Goal
          </Badge>
        )}
      </div>

      {/* Scopes */}
      <div className="w-40">
        <div className="flex flex-wrap gap-1">
          {matchedStrategies.map((s) => (
            <Badge
              key={s.id}
              className={`${s.color} border-0 px-2 py-0.5 text-xs font-semibold shadow-none opacity-90`}
            >
              {s.label}
            </Badge>
          ))}
          {matchedStrategies.length === 0 && (
            <span className="text-slate-600">-</span>
          )}
        </div>
      </div>

      {/* Outcome */}
      <div className="w-24">
        <div
          className={`flex items-center gap-1.5 text-sm ${
            event.outcome ? 'text-green-500' : 'text-red-500/80'
          }`}
        >
          <div
            className={`h-1.5 w-1.5 rounded-full ${
              event.outcome ? 'bg-green-500' : 'bg-red-500/80'
            }`}
          />
          {event.outcome ? 'Success' : 'Fail'}
        </div>
      </div>
    </div>
  );
};
