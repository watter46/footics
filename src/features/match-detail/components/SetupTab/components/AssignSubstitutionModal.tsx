'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { nanoid } from 'nanoid';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { db, type Event, type Match, type TempPlayer } from '@/lib/db';
import { toast } from '@/features/toast/toast-store';

import { SubstituteList } from './SubstituteList';
import { useTeamPlayers } from '../hooks/useTeamPlayers';

interface AssignSubstitutionModalProps {
  isOpen: boolean;
  tempSlotId?: string | null;
  eventId?: number | null;
  teamId: number;
  matchId: number;
  substitutedOutPlayers: TempPlayer[];
  defaultPlayerId?: number | null;
  onClose: () => void;
}

interface EventWithAction extends Event {
  actionName: string;
}

const EMPTY_RELATED_EVENTS: EventWithAction[] = [];
const actionNameCache = new Map<number, string>();

const resolveActionName = async (actionId: number): Promise<string> => {
  if (actionNameCache.has(actionId)) {
    return actionNameCache.get(actionId) ?? 'アクション';
  }

  const action = await db.actions_master.get(actionId);
  const resolvedName = action?.name ?? 'アクション';
  actionNameCache.set(actionId, resolvedName);
  return resolvedName;
};

export const AssignSubstitutionModal = ({
  isOpen,
  tempSlotId,
  eventId,
  teamId,
  matchId,
  substitutedOutPlayers,
  defaultPlayerId,
  onClose,
}: AssignSubstitutionModalProps) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(
    defaultPlayerId ?? null
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedPlayerId(defaultPlayerId ?? null);
  }, [defaultPlayerId, eventId, isOpen, tempSlotId]);

  const teamPlayers = useTeamPlayers(teamId);

  const relatedEvents =
    useLiveQuery<EventWithAction[]>(async () => {
      if (typeof eventId === 'number') {
        const event = await db.events.get(eventId);
        if (!event) {
          return EMPTY_RELATED_EVENTS;
        }

        const actionName = await resolveActionName(event.actionId);
        return [
          {
            ...event,
            actionName,
          },
        ];
      }

      if (!tempSlotId) {
        return EMPTY_RELATED_EVENTS;
      }

      const events = await db.events.where({ tempSlotId }).toArray();
      if (events.length === 0) {
        return EMPTY_RELATED_EVENTS;
      }

      const mapped = await Promise.all(
        events.map(async candidate => ({
          ...candidate,
          actionName: await resolveActionName(candidate.actionId),
        }))
      );

      return mapped;
    }, [eventId, tempSlotId]) ?? EMPTY_RELATED_EVENTS;

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
      (playerId): playerId is number =>
        typeof playerId === 'number' && Number.isFinite(playerId)
    );

    return new Set(ids);
  }, [match]);

  const substitutedOutPlayerIds = useMemo(() => {
    const ids = substitutedOutPlayers
      .map(player => player.id)
      .filter((playerId): playerId is number => typeof playerId === 'number');

    return new Set(ids);
  }, [substitutedOutPlayers]);

  const defaultPlayer = useMemo(() => {
    if (typeof defaultPlayerId !== 'number') {
      return null;
    }

    return (
      teamPlayers.find(player => player.id === defaultPlayerId) ?? null
    );
  }, [defaultPlayerId, teamPlayers]);

  const candidatePlayers = useMemo(() => {
    const filtered = teamPlayers.filter(player => {
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
    });

    if (
      defaultPlayer &&
      typeof defaultPlayer.id === 'number' &&
      !filtered.some(player => player.id === defaultPlayer.id)
    ) {
      return [...filtered, defaultPlayer];
    }

    return filtered;
  }, [assignedPlayerIds, defaultPlayer, substitutedOutPlayerIds, teamPlayers]);

  const handlePlayerSelect = (playerId: number, isSelected: boolean) => {
    setSelectedPlayerId(isSelected ? null : playerId);
  };

  const handleClose = () => {
    setSelectedPlayerId(defaultPlayerId ?? null);
    onClose();
  };

  const isGhostContext = Boolean(tempSlotId);
  const isEventContext = typeof eventId === 'number';

  const sheetTitle = useMemo(() => {
    const firstEvent = relatedEvents[0];
    if (isGhostContext) {
      return firstEvent?.positionName
        ? `${firstEvent.positionName} の割り当て`
        : 'ゴースト選手の割り当て';
    }

    if (isEventContext) {
      if (defaultPlayer) {
        return `${defaultPlayer.name ?? '選手'} の再割り当て`;
      }

      if (firstEvent?.positionName) {
        return `${firstEvent.positionName} の再割り当て`;
      }

      return '交代済み選手の再割り当て';
    }

    return '交代イベントの割り当て';
  }, [defaultPlayer, isEventContext, isGhostContext, relatedEvents]);

  const handleSheetChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  const refreshSubstitutedOutPlayerIds = async () => {
    if (typeof matchId !== 'number') {
      return;
    }

    const outAction = await db.actions_master
      .where('name')
      .equals('交代OUT')
      .first();

    if (!outAction?.id) {
      return;
    }

    const events = await db.events
      .where('matchId')
      .equals(matchId)
      .filter(
        event =>
          event.actionId === outAction.id &&
          event.teamId === teamId &&
          typeof event.playerId === 'number'
      )
      .toArray();

    const uniqueIds = Array.from(
      new Set(events.map(event => event.playerId as number))
    );

    await db.matches.update(matchId, {
      substitutedOutPlayerIds: uniqueIds,
    });
  };

  const handleAssign = async () => {
    if (!isGhostContext && !isEventContext) {
      toast.error('割り当て対象のイベントが見つかりません');
      return;
    }

    if (isGhostContext && (!tempSlotId || selectedPlayerId == null)) {
      toast.error('割り当てる選手を選んでください');
      return;
    }

    setIsSaving(true);
    try {
      if (isGhostContext && tempSlotId && selectedPlayerId != null) {
        await db.events
          .where({ tempSlotId })
          .modify({ playerId: selectedPlayerId, tempSlotId: null });

        await refreshSubstitutedOutPlayerIds();
        toast.success('ゴースト選手を割り当てました');
      } else if (isEventContext && typeof eventId === 'number') {
        const currentEvent = (relatedEvents[0] ??
          (await db.events.get(eventId))) as Event | undefined;

        if (!currentEvent) {
          toast.error('対象のイベントが見つかりません');
          return;
        }

        const nextPlayerId = selectedPlayerId ?? null;
        const nextTempSlotId =
          nextPlayerId == null
            ? currentEvent.tempSlotId ?? `ghost-${nanoid(8)}`
            : null;

        await db.events.update(eventId, {
          playerId: nextPlayerId,
          tempSlotId: nextTempSlotId,
        });

        await refreshSubstitutedOutPlayerIds();
        toast.success(
          nextPlayerId == null ? '割り当てを解除しました' : '交代情報を更新しました'
        );
      }

      handleClose();
    } catch (error) {
      console.error('Failed to assign substitution', error);
      toast.error('割り当てに失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleSheetChange}>
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-100">{sheetTitle}</h2>
          <p className="text-xs text-slate-400">
            {isEventContext
              ? '交代済みイベントの割り当て内容を更新できます。'
              : '未割り当ての交代イベントに選手を紐付けてください。'}
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
                    <span className="ml-2 text-xs text-slate-500">
                      [{event.positionName}]
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-200">
              割り当てる選手を選択
            </p>
            {isEventContext ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPlayerId(null)}
                disabled={selectedPlayerId == null || isSaving}
              >
                割り当て解除
              </Button>
            ) : null}
          </div>
          <SubstituteList
            players={candidatePlayers}
            selectedPlayerId={selectedPlayerId}
            onPlayerSelect={handlePlayerSelect}
            highlightVariant={isEventContext ? 'reassign' : 'default'}
          />
        </div>

        <Separator className="border-slate-800" />

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSaving}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={
              isSaving || (isGhostContext && selectedPlayerId == null)
            }
          >
            {isGhostContext ? '割り当てる' : '保存'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
