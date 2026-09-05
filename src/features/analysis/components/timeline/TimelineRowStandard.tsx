'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatTimelineTime } from '@/lib/timeline-utils';
import type { EventStrategy } from '@/registry/event-strategy';
import type { EventRow, Match } from '@/types';

export interface TimelineRowStandardProps {
  event: EventRow;
  index: number;
  virtualRow: {
    size: number;
    start: number;
  };
  metadata: Match;
  activeStrategyList: EventStrategy[];
  activeStrategyParams: Record<string, Record<string, unknown>>;
}

export const TimelineRowStandard: React.FC<TimelineRowStandardProps> = ({
  event,
  index,
  virtualRow,
  metadata,
  activeStrategyList,
  activeStrategyParams,
}) => {
  const { playerIdNameDictionary, teams } = metadata;
  const isHome = Number(event.team_id) === Number(teams.home.teamId);
  const timeString = formatTimelineTime(event);
  const tacticalMinute = Math.floor(event.minute ?? 0);
  const tacticalUrl = `/tactical?matchId=${encodeURIComponent(metadata.id)}&minute=${tacticalMinute}`;

  const matchedStrategies = activeStrategyList.filter((s) => {
    const params = activeStrategyParams[s.id] || {};
    return s.predicate(event, params);
  });

  return (
    <div
      data-index={index}
      className="group flex items-center px-4 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors"
      style={{ height: `${virtualRow.size}px` }}
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

      {/* Actions (Tactical link) */}
      <div className="w-10 flex items-center justify-center shrink-0">
        <Link
          href={tacticalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-colors"
          title={`Tactical戦術ボードを開く (${tacticalMinute}分)`}
          aria-label={`Open in Tactical at minute ${tacticalMinute}`}
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
