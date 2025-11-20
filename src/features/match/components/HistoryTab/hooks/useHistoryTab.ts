import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import { db, type ActionMaster, type Match, type Player, type TempTeam } from '@/lib/db';
import { useEventRepository } from '@/features/match/hooks/useEventRepository';

import {
  buildMemoSummary,
  createTeamDisplayName,
  getCategoryMeta,
  resolveEventSubjectLabel,
  resolveTeamIds,
} from '../utils';
import type { ResolvedHistoryEvent } from '../types';

// ---------------------------------------------------------------------------
// Helper Hook: useTeamNameMap
// ---------------------------------------------------------------------------
const useTeamNameMap = (match: Match): Map<number, string> => {
  const teamIds = resolveTeamIds(match);

  const teamsData = useLiveQuery<TempTeam[]>(async () => {
    if (teamIds.length === 0) {
      return [];
    }
    return db.temp_teams.where('id').anyOf(teamIds).toArray();
  }, [teamIds[0] ?? null, teamIds[1] ?? null]);

  return useMemo(() => {
    const map = new Map<number, string>();
    (teamsData ?? []).forEach(team => {
      if (typeof team.id === 'number') {
        map.set(team.id, team.name);
      }
    });
    return map;
  }, [teamsData]);
};

// ---------------------------------------------------------------------------
// Main Hook: useHistoryTab
// ---------------------------------------------------------------------------
export const useHistoryTab = (match: Match) => {
  const { useMatchEvents } = useEventRepository();

  // 1. Repository からイベントを取得 (Raw Data)
  const rawEvents = useMatchEvents(match.id ?? -1);

  // 2. イベントデータの解決 (Action, Player, 交代ロジックなど)
  const events = useLiveQuery<ResolvedHistoryEvent[]>(
    async () => {
      if (!rawEvents) {
        return [];
      }

      const matchId = match.id;
      if (!matchId) {
        return [];
      }

      const subjectTeamId =
        typeof match.subjectTeamId === 'number'
          ? match.subjectTeamId
          : match.team1Id;

      try {
        // rawEvents は既に matchTime でソートされているが、ID順も考慮して再ソート
        const sortedEvents = [...rawEvents].sort((a, b) => {
          const timeDiff = b.matchTime.localeCompare(a.matchTime);
          if (timeDiff !== 0) {
            return timeDiff;
          }
          return (b.id ?? 0) - (a.id ?? 0);
        });

        type EventRecord = (typeof sortedEvents)[number];
        type EventWithAction = EventRecord & { action: ActionMaster | null };

        // Action情報の結合
        const eventsWithAction: EventWithAction[] = await Promise.all(
          sortedEvents.map(async event => ({
            ...event,
            action: (await db.actions_master.get(event.actionId)) ?? null,
          }))
        );

        // 交代OUTイベントの一時保存用
        const pendingOutEvents: EventWithAction[] = [];
        const eventsToResolve = eventsWithAction.filter(event => {
          if (event.action?.name === '交代OUT') {
            pendingOutEvents.push(event);
            return false;
          }
          return true;
        });

        // 各イベントの解決
        const resolvedEvents = await Promise.all(
          eventsToResolve.map(async event => {
            const { action, ...eventWithoutAction } = event;
            const categoryMeta = getCategoryMeta(action ?? null);

            const isOpponent =
              typeof eventWithoutAction.teamId === 'number'
                ? eventWithoutAction.teamId !== subjectTeamId
                : Boolean(eventWithoutAction.opponentPosition);

            const basePositionLabel = isOpponent
              ? eventWithoutAction.opponentPosition ?? 'ポジション未設定'
              : eventWithoutAction.positionName ?? 'ポジション未設定';

            const player: Player | null = eventWithoutAction.playerId
              ? (await db.players.get(eventWithoutAction.playerId)) ?? null
              : null;

            // 交代INの場合の特殊処理
            if (action?.name === '交代IN') {
              const playerIn = player;

              // 対応する交代OUTイベントを探す
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

            // 通常イベント
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
    [rawEvents, match.id, match.subjectTeamId, match.team1Id]
  ) ?? [];

  // 3. チーム名の解決
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

  return {
    events,
    isLoading: !rawEvents, // rawEvents が undefined の間はロード中とみなす
    isEmpty: events.length === 0,
    ownTeamName,
    opponentTeamName,
  };
};
