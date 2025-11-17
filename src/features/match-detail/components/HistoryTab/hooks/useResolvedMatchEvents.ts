import { useLiveQuery } from 'dexie-react-hooks';

import { db, type ActionMaster, type Player } from '@/lib/db';

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

        type EventRecord = (typeof sortedEvents)[number];
        type EventWithAction = EventRecord & { action: ActionMaster | null };

        const eventsWithAction: EventWithAction[] = await Promise.all(
          sortedEvents.map(async event => ({
            ...event,
            action: (await db.actions_master.get(event.actionId)) ?? null,
          }))
        );

        const pendingOutEvents: EventWithAction[] = [];
        const eventsToResolve = eventsWithAction.filter(event => {
          if (event.action?.name === '交代OUT') {
            pendingOutEvents.push(event);
            return false;
          }

          return true;
        });

        const resolvedEvents = await Promise.all(
          eventsToResolve.map(async event => {
            const { action, ...eventWithoutAction } = event;
            const categoryMeta = getCategoryMeta(action ?? null);
            const isOpponent = Boolean(eventWithoutAction.opponentPosition);
            const basePositionLabel = isOpponent
              ? eventWithoutAction.opponentPosition ?? 'ポジション未設定'
              : eventWithoutAction.positionName ?? 'ポジション未設定';

            const player: Player | null = eventWithoutAction.playerId
              ? (await db.players.get(eventWithoutAction.playerId)) ?? null
              : null;

            if (action?.name === '交代IN') {
              const playerIn = player;
              let playerOutEventIndex = pendingOutEvents.findIndex(
                candidate =>
                  candidate.matchTime === event.matchTime &&
                  candidate.positionName === event.positionName
              );

              if (playerOutEventIndex === -1) {
                playerOutEventIndex = pendingOutEvents.findIndex(
                  candidate => candidate.matchTime === event.matchTime
                );
              }

              const playerOutEvent =
                playerOutEventIndex !== -1
                  ? pendingOutEvents.splice(playerOutEventIndex, 1)[0]
                  : undefined;

              const playerOut = playerOutEvent?.playerId
                ? (await db.players.get(playerOutEvent.playerId)) ?? null
                : null;

              const inLabel = playerIn
                ? `IN: #${playerIn.number} ${playerIn.name}`
                : 'IN: 未登録';

              let outLabel = 'OUT: (未設定)';
              if (playerOut) {
                outLabel = `OUT: #${playerOut.number} ${playerOut.name}`;
              } else if (playerOutEvent) {
                outLabel = `OUT: [${playerOutEvent.positionName ?? '未設定'}]`;
              }

              return {
                ...eventWithoutAction,
                actionName: '交代',
                categoryLabel: categoryMeta.label,
                markerClassName: categoryMeta.markerClassName,
                icon: categoryMeta.icon,
                subjectLabel: `${outLabel} → ${inLabel}`,
                memoSummary: buildMemoSummary(eventWithoutAction.memo),
                isOpponent,
                positionLabel: `${basePositionLabel} | ${outLabel} → ${inLabel}`,
                playerSnapshotLabel: inLabel,
                playerOutSnapshotLabel: outLabel,
              } satisfies ResolvedHistoryEvent;
            }

            const actionName = action?.name ?? 'アクション未登録';
            const playerSnapshotLabel = player
              ? `#${player.number} ${player.name}`
              : null;

            return {
              ...eventWithoutAction,
              actionName,
              categoryLabel: categoryMeta.label,
              markerClassName: categoryMeta.markerClassName,
              icon: categoryMeta.icon,
              subjectLabel: resolveEventSubjectLabel(eventWithoutAction, player ?? null),
              memoSummary: buildMemoSummary(eventWithoutAction.memo),
              isOpponent,
              positionLabel: basePositionLabel,
              playerSnapshotLabel,
              playerOutSnapshotLabel: null,
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
