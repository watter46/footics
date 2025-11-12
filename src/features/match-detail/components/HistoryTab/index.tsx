'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type Match } from '@/lib/db';

import { HistoryEventCard } from './_components/EventCard';
import { HistoryTimelineMarker } from './_components/TimelineMarker';
import { TimelineHeader } from './_components/TimelineHeader';
import { useResolvedMatchEvents } from './hooks/useResolvedMatchEvents';
import { useTeamNameMap } from './hooks/useTeamNameMap';
import { createTeamDisplayName } from './utils';

interface HistoryTabProps {
  match: Match;
}

export const HistoryTab = ({ match }: HistoryTabProps) => {
  const events = useResolvedMatchEvents(match.id);
  const teamNameMap = useTeamNameMap(match);

  const ownTeamName = createTeamDisplayName(match.team1Id, teamNameMap, '自チーム');

  const opponentTeamName = createTeamDisplayName(
    match.team2Id,
    teamNameMap,
    '相手チーム'
  );

  if (!match.id) {
    return (
      <Card className="border-slate-800/70 bg-slate-900/40">
        <CardContent className="py-10 text-center text-sm text-slate-400">
          試合情報が正しく読み込めませんでした。
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-800/70 bg-slate-900/40 p-0">
      <CardHeader className='p-4'>
        <CardTitle className="text-lg text-slate-100">イベント履歴</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {events.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            まだイベントは記録されていません。
          </div>
        ) : (
          <>
          <TimelineHeader
              leftLabel={opponentTeamName}
              rightLabel={ownTeamName}
            />
          <div className="max-h-[520px] overflow-y-auto">
            <div className="px-1 pt-6 pb-10">
              <div className="relative mx-auto max-w-4xl">
                <div
                  className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-800"
                  aria-hidden="true"
                />
                <div className="flex flex-col gap-2">
                  {events.map(event => (
                    <div
                      key={event.id ?? `${event.matchId}-${event.matchTime}-${event.actionId}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center"
                    >
                      <div className="flex w-full justify-end">
                        {event.isOpponent ? (
                          <HistoryEventCard event={event} align="left" />
                        ) : (
                          <span className="block h-0 w-full" aria-hidden="true" />
                        )}
                      </div>

                      <HistoryTimelineMarker colorClass={event.markerClassName} />

                      <div className="flex w-full justify-start">
                        {!event.isOpponent ? (
                          <HistoryEventCard event={event} align="right" />
                        ) : (
                          <span className="block h-0 w-full" aria-hidden="true" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
