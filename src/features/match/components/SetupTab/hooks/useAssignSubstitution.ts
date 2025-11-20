import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { nanoid } from 'nanoid';
import { db, type Event, type Match, type TempPlayer } from '@/lib/db';
import { toast } from '@/features/toast/toast-store';
import { useTeamRepository } from '@/features/match/hooks/useTeamRepository';

interface UseAssignSubstitutionParams {
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

export const useAssignSubstitution = ({
  isOpen,
  tempSlotId,
  eventId,
  teamId,
  matchId,
  substitutedOutPlayers,
  defaultPlayerId,
  onClose,
}: UseAssignSubstitutionParams) => {
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

  const { useTeamPlayers } = useTeamRepository();
  const rawTeamPlayers = useTeamPlayers(teamId);
  const teamPlayers = useMemo(() => rawTeamPlayers ?? [], [rawTeamPlayers]);

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

  return {
    selectedPlayerId,
    isSaving,
    relatedEvents,
    candidatePlayers,
    sheetTitle,
    isGhostContext,
    isEventContext,
    handlePlayerSelect,
    handleClose,
    handleAssign,
  };
};
