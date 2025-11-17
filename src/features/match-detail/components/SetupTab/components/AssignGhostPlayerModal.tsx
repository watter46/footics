'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { db, type Event, type Match, type TempPlayer } from '@/lib/db';
import { toast } from '@/features/toast/toast-store';

import { SubstituteList } from './SubstituteList';
import { useTeamPlayers } from '../hooks/useTeamPlayers';

interface AssignGhostPlayerModalProps {
  isOpen: boolean;
  tempSlotId: string | null;
  teamId: number;
  matchId: number;
  substitutedOutPlayers: TempPlayer[];
  onClose: () => void;
}

interface EventWithAction extends Event {
  actionName: string;
}

const EMPTY_RELATED_EVENTS: EventWithAction[] = [];

export const AssignGhostPlayerModal = ({
  isOpen,
  tempSlotId,
  teamId,
  matchId,
  substitutedOutPlayers,
  onClose,
}: AssignGhostPlayerModalProps) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const teamPlayers = useTeamPlayers(teamId);

  const relatedEvents =
    useLiveQuery<EventWithAction[]>(
      async () => {
        if (!tempSlotId) {
          return EMPTY_RELATED_EVENTS;
        }

        const events = await db.events.where({ tempSlotId }).toArray();
        const cache = new Map<number, string>();

        return Promise.all(
          events.map(async event => {
            if (!cache.has(event.actionId)) {
              const action = await db.actions_master.get(event.actionId);
              cache.set(event.actionId, action?.name ?? 'アクション');
            }

            return {
              ...event,
              actionName: cache.get(event.actionId) ?? 'アクション',
            } satisfies EventWithAction;
          })
        );
      },
      [tempSlotId]
    ) ?? EMPTY_RELATED_EVENTS;

  const match =
    useLiveQuery<Match | null>(
      async () => {
        if (typeof matchId !== 'number') {
          return null;
        }

        return (await db.matches.get(matchId)) ?? null;
      },
      [matchId]
    ) ?? null;

  const assignedPlayerIds = useMemo(() => {
    if (!match?.assignedPlayers) {
      return new Set<number>();
    }

    const ids = Object.values(match.assignedPlayers).filter(
      (playerId): playerId is number => typeof playerId === 'number' && Number.isFinite(playerId)
    );

    return new Set(ids);
  }, [match]);

  const substitutedOutPlayerIds = useMemo(() => {
    const ids = substitutedOutPlayers
      .map(player => player.id)
      .filter((playerId): playerId is number => typeof playerId === 'number');

    return new Set(ids);
  }, [substitutedOutPlayers]);

  const candidatePlayers = useMemo(
    () =>
      teamPlayers.filter(player => {
        if (typeof player.id !== 'number') {
          return false;
        }

        if (assignedPlayerIds.has(player.id)) {
          return false;
        }

        if (substitutedOutPlayerIds.has(player.id)) {
          return false;
        }

        return true;
      }),
    [assignedPlayerIds, substitutedOutPlayerIds, teamPlayers]
  );

  const handlePlayerSelect = (playerId: number, isSelected: boolean) => {
    setSelectedPlayerId(isSelected ? null : playerId);
  };

  const handleClose = () => {
    setSelectedPlayerId(null);
    onClose();
  };

  const handleAssign = async () => {
    if (!tempSlotId || selectedPlayerId == null) {
      toast.error('選手を選択してください');
      return;
    }

    try {
      await db.events
        .where({ tempSlotId })
        .modify({ playerId: selectedPlayerId, tempSlotId: null });

      const currentSubstitutedIds = substitutedOutPlayers
        .map(player => (typeof player.id === 'number' ? player.id : null))
        .filter((playerId): playerId is number => playerId != null);

      if (!currentSubstitutedIds.includes(selectedPlayerId)) {
        const updatedIds = [...currentSubstitutedIds, selectedPlayerId];
        await db.matches.update(matchId, {
          substitutedOutPlayerIds: updatedIds,
        });
      }

      toast.success('ゴースト選手を割り当てました');
      handleClose();
    } catch (error) {
      console.error('Failed to assign ghost player', error);
      toast.error('割り当てに失敗しました');
    }
  };

  const sheetTitle = useMemo(() => {
    if (!tempSlotId) {
      return 'ゴースト選手の割り当て';
    }
    const firstEvent = relatedEvents[0];
    return firstEvent?.positionName
      ? `${firstEvent.positionName} の割り当て`
      : 'ゴースト選手の割り当て';
  }, [relatedEvents, tempSlotId]);

  const handleSheetChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleSheetChange}>
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-100">{sheetTitle}</h2>
          <p className="text-xs text-slate-400">
            未割り当ての交代イベントに選手を紐付けてください。
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-800/70 bg-slate-900/40 p-4">
          <p className="text-sm font-semibold text-slate-200">関連アクション</p>
          {relatedEvents.length === 0 ? (
            <p className="text-xs text-slate-500">関連するアクションはありません。</p>
          ) : (
            <ul className="space-y-2">
              {relatedEvents.map(event => (
                <li
                  key={event.id}
                  className="rounded-lg border border-slate-800/60 bg-slate-900/30 px-3 py-2 text-sm text-slate-200"
                >
                  <span className="font-semibold text-sky-300">{event.actionName}</span>
                  <span className="ml-2 text-xs text-slate-400">{event.matchTime}</span>
                  {event.positionName ? (
                    <span className="ml-2 text-xs text-slate-500">[{event.positionName}]</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-200">割り当てる選手を選択</p>
          <SubstituteList
            players={candidatePlayers}
            selectedPlayerId={selectedPlayerId}
            onPlayerSelect={handlePlayerSelect}
          />
        </div>

        <Separator className="border-slate-800" />

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleClose}>
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={!tempSlotId || selectedPlayerId == null}
          >
            割り当てる
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
