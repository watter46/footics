import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from '@/features/toast/toast-store';
import { useEditEventStore } from '@/features/match-detail/stores/edit-event-store';
import { db, type IEvent, type IPlayer, type IActionMaster } from '@/lib/db';
import { formatDisplayTime, parseTimeInput } from '@/lib/utils/timer';

interface UseEditEventFormResult {
  event: IEvent | null;
  player: IPlayer | null;
  actionName: string | null;
  subjectLabel: string;
  draftMemo: string;
  setDraftMemo: (value: string) => void;
  draftTime: string;
  setDraftTime: (value: string) => void;
  handleAdjustTime: (deltaSeconds: number) => void;
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
  isActionSheetOpen: boolean;
  openActionSheet: () => void;
  handleActionSheetOpenChange: (open: boolean) => void;
  handleActionSelect: (actionId: number, actionName: string) => void;
}

export const useEditEventForm = (): UseEditEventFormResult => {
  const editingEventId = useEditEventStore(state => state.editingEventId);
  const closeEditSheet = useEditEventStore(state => state.closeEditSheet);

  const snapshot =
    useLiveQuery(async () => {
      if (editingEventId == null) {
        return null;
      }

      const eventRecord = await db.events.get(editingEventId);
      if (!eventRecord) {
        return null;
      }

      const [playerRecord, actionRecord] = await Promise.all([
        eventRecord.playerId ? db.players.get(eventRecord.playerId) : null,
        db.actions_master.get(eventRecord.actionId),
      ]);

      return {
        event: eventRecord,
        player: (playerRecord ?? null) as IPlayer | null,
        action: actionRecord ?? null,
      } satisfies {
        event: IEvent;
        player: IPlayer | null;
        action: IActionMaster | null;
      };
    }, [editingEventId], null) ?? null;

  const event = snapshot?.event ?? null;
  const player = snapshot?.player ?? null;
  const persistedActionName = snapshot?.action?.name ?? null;

  const [draftMemo, setDraftMemo] = useState('');
  const [draftTime, setDraftTime] = useState('00:00');
  const [draftActionId, setDraftActionId] = useState<number | null>(null);
  const [draftActionName, setDraftActionName] = useState<string | null>(null);
  const [isActionSheetOpen, setActionSheetOpen] = useState(false);
  const lastSyncedIdRef = useRef<number | null>(null);
  const syncDraft = useCallback((memo: string, time: string) => {
    setDraftMemo(memo);
    setDraftTime(time);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!event) {
      if (lastSyncedIdRef.current !== null) {
        lastSyncedIdRef.current = null;
        syncDraft('', '00:00');
      }
      setDraftActionId(null);
      setDraftActionName(null);
      return;
    }

    const currentId = event.id ?? null;
    if (currentId == null) {
      if (lastSyncedIdRef.current !== null) {
        lastSyncedIdRef.current = null;
        syncDraft(event.memo ?? '', event.matchTime ?? '00:00');
      }
      setDraftActionId(null);
      setDraftActionName(null);
      return;
    }

    if (lastSyncedIdRef.current === currentId) {
      return;
    }

    lastSyncedIdRef.current = currentId;
    syncDraft(event.memo ?? '', event.matchTime ?? '00:00');
    setDraftActionId(typeof event.actionId === 'number' ? event.actionId : null);
    setDraftActionName(persistedActionName);
  }, [event, persistedActionName, syncDraft]);

  useEffect(() => {
    if (!editingEventId) {
      setActionSheetOpen(false);
    }
  }, [editingEventId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const subjectLabel = useMemo(() => {
    if (!event) {
      return 'イベントを選択してください';
    }

    if (player) {
      const positionName = event.positionName ?? '選手';
      const playerName = player.name ?? '対象';
      return `[${positionName}] ${playerName}`;
    }

    return event.opponentPosition ?? event.positionName ?? '対象不明';
  }, [event, player]);

  const handleAdjustTime = useCallback(
    (deltaSeconds: number) => {
      const parsedCurrent = parseTimeInput(draftTime);
      const fallbackSeconds = parseTimeInput(event?.matchTime ?? '') ?? 0;
      const baseSeconds = parsedCurrent ?? fallbackSeconds;
      const nextSeconds = Math.max(0, baseSeconds + deltaSeconds);
      setDraftTime(formatDisplayTime(nextSeconds));
    },
    [draftTime, event?.matchTime]
  );

  const handleActionSheetOpenChange = useCallback((open: boolean) => {
    setActionSheetOpen(open);
  }, []);

  const openActionSheet = useCallback(() => {
    setActionSheetOpen(true);
  }, []);

  const closeActionSheet = useCallback(() => {
    setActionSheetOpen(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingEventId) {
      return;
    }

    const parsedTime = parseTimeInput(draftTime);
    if (parsedTime === null) {
      toast.error('時間の形式が正しくありません (MM:SS)');
      return;
    }

    if (draftActionId == null) {
      toast.error('アクションを選択してください');
      return;
    }

    try {
      await db.events.update(editingEventId, {
        memo: draftMemo,
        matchTime: draftTime,
        actionId: draftActionId,
      });
      closeEditSheet();
      toast.success('イベントを更新しました');
    } catch (error) {
      console.error('イベントの更新に失敗しました', error);
      toast.error('イベントの更新に失敗しました');
    }
  }, [closeEditSheet, draftActionId, draftMemo, draftTime, editingEventId]);

  const handleDelete = useCallback(async () => {
    if (!editingEventId) {
      return;
    }

    if (!window.confirm('このイベントを削除しますか？')) {
      return;
    }

    try {
      await db.events.delete(editingEventId);
      closeEditSheet();
      toast.info('イベントを削除しました');
    } catch (error) {
      console.error('イベントの削除に失敗しました', error);
      toast.error('イベントの削除に失敗しました');
    }
  }, [closeEditSheet, editingEventId]);

  const handleActionSelect = useCallback(
    (actionId: number, actionName: string) => {
      setDraftActionId(actionId);
      setDraftActionName(actionName);
      closeActionSheet();
    },
    [closeActionSheet]
  );

  return {
    event,
    player,
    actionName: draftActionName,
    subjectLabel,
    draftMemo,
    setDraftMemo,
    draftTime,
    setDraftTime,
    handleAdjustTime,
    handleSave,
    handleDelete,
    isActionSheetOpen,
    openActionSheet,
    handleActionSheetOpenChange,
    handleActionSelect,
  };
};
