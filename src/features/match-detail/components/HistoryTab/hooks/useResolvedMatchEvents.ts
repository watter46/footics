import { useLiveQuery } from 'dexie-react-hooks';

import { db, type Player } from '@/lib/db';

import {
  buildMemoSummary,
  getCategoryMeta,
  resolveEventSubjectLabel,
} from '../utils';
import type { ResolvedHistoryEvent } from '../types';

export const useResolvedMatchEvents = (
  matchId?: number
): ResolvedHistoryEvent[] =>
  useLiveQuery<ResolvedHistoryEvent[]>(
    async () => {
      if (!matchId) {
        return [];
      }

      try {
        const baseEvents = await db.events.where('matchId').equals(matchId).toArray();

        const sortedEvents = baseEvents.sort((a, b) => {
          const timeDiff = b.matchTime.localeCompare(a.matchTime);

          if (timeDiff !== 0) {
            return timeDiff;
          }

          return (b.id ?? 0) - (a.id ?? 0);
        });

        const resolvedEvents = await Promise.all(
          sortedEvents.map(async event => {
            const [action, player] = await Promise.all([
              db.actions_master.get(event.actionId),
              event.playerId
                ? db.players.get(event.playerId)
                : Promise.resolve<Player | null>(null),
            ]);

            const categoryMeta = getCategoryMeta(action ?? null);
            const isOpponent = Boolean(event.opponentPosition);
            const positionLabel = isOpponent
              ? event.opponentPosition ?? 'ポジション未設定'
              : event.positionName ?? 'ポジション未設定';
            const playerSnapshotLabel = player
              ? `#${player.number} ${player.name}`
              : null;

            return {
              ...event,
              actionName: action?.name ?? 'アクション未登録',
              categoryLabel: categoryMeta.label,
              markerClassName: categoryMeta.markerClassName,
              subjectLabel: resolveEventSubjectLabel(event, player ?? null),
              memoSummary: buildMemoSummary(event.memo),
              isOpponent,
              positionLabel,
              playerSnapshotLabel,
            } satisfies ResolvedHistoryEvent;
          })
        );

        return resolvedEvents;
      } catch (error) {
        console.error('Failed to load match events for history tab', error);
        return [];
      }
    },
    [matchId]
  ) ?? [];
