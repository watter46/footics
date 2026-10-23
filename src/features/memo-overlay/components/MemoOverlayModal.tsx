'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { putMatchMemo, saveCustomEvent } from '@/lib/db/extension-db-queries';
import { createSavePayload } from '@/lib/features/memo-overlay/memoOverlayLogic';
import { customEventKeys, eventKeys, matchKeys } from '@/lib/query-keys';
import { useMemoOverlayEventBridge } from '../hooks/useMemoOverlayEventBridge';
import { MemoOverlayStoreProvider } from '../stores/memo-overlay-provider';
import { useMemoOverlayStore } from '../stores/memo-overlay-store';
import type { MemoMode } from '../stores/memo-overlay-types';
import { MemoOverlayView } from './MemoOverlayView';

interface MemoOverlayModalProps {
  matchId: string;
  initialMemo?: string;
  mode?: MemoMode;
}

export const MemoOverlayModal: React.FC<MemoOverlayModalProps> = ({
  matchId,
  initialMemo,
  mode = 'EVENT',
}) => {
  const queryClient = useQueryClient();
  const isModalOpen = useMemoOverlayStore((s) => s.isModalOpen);
  const setModalOpen = useMemoOverlayStore((s) => s.setModalOpen);
  const reset = useMemoOverlayStore((s) => s.reset);
  const eventId = useMemoOverlayStore((s) => s.eventId);
  const isSaving = useMemoOverlayStore((s) => s.isSaving);
  const setIsSaving = useMemoOverlayStore((s) => s.setIsSaving);

  const handleClose = useCallback(() => {
    setModalOpen(false);
    reset();
  }, [setModalOpen, reset]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    const currentState = useMemoOverlayStore.getState();
    const payload = createSavePayload(currentState);
    if (!payload) return;

    setIsSaving(true);
    try {
      if (payload.type === 'EVENT') {
        await saveCustomEvent({
          id: eventId || crypto.randomUUID(),
          match_id: matchId,
          period: payload.period,
          minute: payload.minute,
          second: payload.second,
          labels: payload.labels,
          memo: payload.memo,
          created_at: Date.now(),
        });
        queryClient.invalidateQueries({
          queryKey: customEventKeys.byMatch(matchId),
        });
        queryClient.invalidateQueries({ queryKey: eventKeys.all });
      } else {
        await putMatchMemo({
          matchId,
          memo: payload.memo,
          updatedAt: Date.now(),
        });
        queryClient.invalidateQueries({ queryKey: matchKeys.memo(matchId) });
      }
      handleClose();
    } catch (err) {
      console.error('[MemoOverlayModal] Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  }, [matchId, eventId, queryClient, handleClose, isSaving, setIsSaving]);

  // footics-action イベント連携（外部からの操作をハンドラへ繋ぐ）
  useMemoOverlayEventBridge(handleClose, handleSave, undefined, isModalOpen);

  // モーダル表示中の hotkeys 登録（直接ハンドラ呼出）
  useHotkeys(
    'escape',
    (e) => {
      e.preventDefault();
      handleClose();
    },
    { enabled: isModalOpen, enableOnFormTags: true },
    [isModalOpen, handleClose],
  );

  useHotkeys(
    ['mod+enter', 'ctrl+enter', 'meta+enter'],
    (e) => {
      e.preventDefault();
      handleSave();
    },
    { enabled: isModalOpen, enableOnFormTags: true },
    [isModalOpen, handleSave],
  );

  if (!isModalOpen) return null;

  return (
    <MemoOverlayStoreProvider
      initialState={{ isModalOpen: true, mode, memo: initialMemo ?? '' }}
    >
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <div className="relative w-full max-w-[420px] aspect-[1/1.3] shadow-2xl rounded-xl overflow-hidden">
          <MemoOverlayView
            matchId={matchId}
            onClose={handleClose}
            onSave={handleSave}
            initialMemo={initialMemo}
            className="static w-full h-full min-w-0 aspect-auto shadow-none border-none animate-in zoom-in-95 duration-200"
          />
        </div>
      </div>
    </MemoOverlayStoreProvider>
  );
};
