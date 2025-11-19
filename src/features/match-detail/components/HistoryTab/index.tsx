'use client';

import { AnimatePresence, motion } from 'framer-motion';

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
  const events = useResolvedMatchEvents(match);
  const teamNameMap = useTeamNameMap(match);

  const subjectTeamId = match.subjectTeamId ?? match.team1Id;
  const opponentTeamId =
    subjectTeamId === match.team1Id ? match.team2Id : match.team1Id;

  const ownTeamName = createTeamDisplayName(
    subjectTeamId,
    teamNameMap,
    '自チーム'
  );

  const opponentTeamName = createTeamDisplayName(
    opponentTeamId,
    teamNameMap,
    '相手チーム'
  );

  if (!match.id) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          試合情報が正しく読み込めませんでした。
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-0">
      <CardHeader className="p-4">
        <CardTitle className="text-foreground text-lg">イベント履歴</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {events.length === 0 ? (
          <div className="text-muted-foreground py-16 text-center text-sm">
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
                    className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/10"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col gap-2">
                    <AnimatePresence initial={false} mode="popLayout">
                      {events.map(event => (
                        <motion.div
                          key={event.id ?? `${event.matchId}-${event.matchTime}-${event.actionId}`}
                          layout
                          initial={{ opacity: 0, y: 28 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -28 }}
                          transition={{ duration: 0.22, ease: 'easeOut' }}
                          className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center"
                        >
                          <div className="flex w-full justify-end">
                            {event.isOpponent ? (
                              <HistoryEventCard
                                event={event}
                                align="left"
                                icon={event.icon}
                              />
                            ) : (
                              <span className="block h-0 w-full" aria-hidden="true" />
                            )}
                          </div>

                          <HistoryTimelineMarker
                            colorClass={event.markerClassName}
                            icon={event.icon}
                          />

                          <div className="flex w-full justify-start">
                            {!event.isOpponent ? (
                              <HistoryEventCard
                                event={event}
                                align="right"
                                icon={event.icon}
                              />
                            ) : (
                              <span className="block h-0 w-full" aria-hidden="true" />
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
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
