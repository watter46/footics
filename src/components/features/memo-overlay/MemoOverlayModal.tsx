'use client';

import { useQueryClient } from '@tanstack/react-query';
import hotkeys from 'hotkeys-js';
import { useCallback, useEffect } from 'react';
import { useMemoOverlayEventBridge } from '@/hooks/features/memo-overlay/useMemoOverlayEventBridge';
import { putMatchMemo, saveCustomEvent } from '@/lib/db';
import { createSavePayload } from '@/lib/features/memo-overlay/memoOverlayLogic';
import { customEventKeys, eventKeys, matchKeys } from '@/lib/query-keys';
import { useMemoOverlayStore } from '@/stores/memo-overlay-store';
import { MemoOverlayView } from './MemoOverlayView';

interface MemoOverlayModalProps {
  matchId: string;
}

export const MemoOverlayModal: React.FC<MemoOverlayModalProps> = ({
  matchId,
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
        queryClient.invalidateQueries({
          queryKey: eventKeys.all,
        });
      } else {
        await putMatchMemo({
          matchId: matchId,
          memo: payload.memo,
          updatedAt: Date.now(),
        });
        queryClient.invalidateQueries({
          queryKey: matchKeys.memo(matchId),
        });
      }
      handleClose();
    } catch (err) {
      console.error('[MemoOverlayModal] Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  }, [matchId, eventId, queryClient, handleClose, isSaving, setIsSaving]);

  // footics-action イベントを useMemoOverlayStore のアクションへ橋渡し
  // CLOSE_OVERLAY → handleClose, SAVE_MEMO → handleSave が機能する
  useMemoOverlayEventBridge(handleClose, handleSave, undefined, isModalOpen);

  // モーダルが開いている間だけ hotkeys を登録（拡張機能と同等の操作感を提供）
  // ※ input/textarea にフォーカスがある場合は PhaseMemoInput 側の onKeyDown が対応するため、
  //   ここでは hotkeys.filter を上書きせず、フォーカス外の補完として機能させる
  useEffect(() => {
    if (!isModalOpen) return;

    hotkeys('escape', (e) => {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent('footics-action', {
          detail: { action: 'CLOSE_OVERLAY' },
        }),
      );
    });

    hotkeys('ctrl+enter,command+enter', (e) => {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent('footics-action', { detail: { action: 'SAVE_MEMO' } }),
      );
    });

    return () => {
      hotkeys.unbind('escape');
      hotkeys.unbind('ctrl+enter');
      hotkeys.unbind('command+enter');
    };
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  return (
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
          className="static w-full h-full min-w-0 aspect-auto shadow-none border-none animate-in zoom-in-95 duration-200"
        />
      </div>
    </div>
  );
};
