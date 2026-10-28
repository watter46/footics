'use client';

import { useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { createSavePayload } from '@/lib/features/memo-overlay/memoOverlayLogic';
import { useMemoOverlayActions } from '../hooks/use-memo-overlay-actions';
import { useMemoOverlayEventBridge } from '../hooks/useMemoOverlayEventBridge';
import {
  MemoOverlayStoreProvider,
  useMemoOverlayStoreApi,
} from '../stores/memo-overlay-provider';
import { useMemoOverlayStore } from '../stores/memo-overlay-store';
import type {
  MemoMode,
  MemoOverlayInitialState,
} from '../stores/memo-overlay-types';
import { MemoOverlayView } from './MemoOverlayView';

interface MemoOverlayModalProps {
  matchId: string;
  initialMemo?: string;
  mode?: MemoMode;
}

interface MemoOverlayModalInnerProps {
  matchId: string;
  initialMemo?: string;
  onClose: () => void;
}

function MemoOverlayModalInner({
  matchId,
  initialMemo,
  onClose,
}: MemoOverlayModalInnerProps) {
  const { saveEvent, saveMemo } = useMemoOverlayActions(matchId);
  const storeApi = useMemoOverlayStoreApi();

  const handleSave = useCallback(async () => {
    const currentState = storeApi.getState();
    if (currentState.isSaving) return;

    const payload = createSavePayload(currentState);
    if (!payload) return;

    currentState.setIsSaving(true);
    try {
      if (payload.type === 'EVENT') {
        await saveEvent({
          id: currentState.eventId || crypto.randomUUID(),
          match_id: matchId,
          period: payload.period,
          minute: payload.minute,
          second: payload.second,
          labels: payload.labels,
          memo: payload.memo,
          created_at: Date.now(),
        });
      } else {
        await saveMemo({
          matchId,
          memo: payload.memo,
          updatedAt: Date.now(),
        });
      }
      onClose();
    } catch (err) {
      console.error('[MemoOverlayModal] Failed to save:', err);
    } finally {
      currentState.setIsSaving(false);
    }
  }, [matchId, onClose, saveEvent, saveMemo, storeApi]);

  // footics-action イベント連携（外部からの操作をハンドラへ繋ぐ）
  useMemoOverlayEventBridge(onClose, handleSave, undefined, true);

  // モーダル表示中の hotkeys 登録（直接ハンドラ呼出）
  useHotkeys(
    'escape',
    (e) => {
      e.preventDefault();
      onClose();
    },
    { enabled: true, enableOnFormTags: true },
    [onClose],
  );

  useHotkeys(
    ['mod+enter', 'ctrl+enter', 'meta+enter'],
    (e) => {
      e.preventDefault();
      handleSave();
    },
    { enabled: true, enableOnFormTags: true },
    [handleSave],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[420px] aspect-[1/1.3] shadow-2xl rounded-xl overflow-hidden">
        <MemoOverlayView
          matchId={matchId}
          onClose={onClose}
          onSave={handleSave}
          initialMemo={initialMemo}
          className="static w-full h-full min-w-0 aspect-auto shadow-none border-none animate-in zoom-in-95 duration-200"
        />
      </div>
    </div>
  );
}

export function MemoOverlayModal({
  matchId,
  initialMemo,
  mode = 'EVENT',
}: MemoOverlayModalProps) {
  const isModalOpen = useMemoOverlayStore((s) => s.isModalOpen);
  const setModalOpen = useMemoOverlayStore((s) => s.setModalOpen);
  const reset = useMemoOverlayStore((s) => s.reset);

  const handleClose = useCallback(() => {
    setModalOpen(false);
    reset();
  }, [setModalOpen, reset]);

  if (!isModalOpen) return null;

  const globalState = useMemoOverlayStore.getState();
  const initialPhase =
    globalState.phase !== 0
      ? globalState.phase
      : mode === 'EVENT' && (globalState.selectedLabels?.length ?? 0) > 0
        ? 2
        : mode === 'EVENT' && globalState.timeStr
          ? 1
          : 0;

  const memoInitialState: MemoOverlayInitialState = {
    mode: mode ?? globalState.mode,
    eventId: globalState.eventId,
    period: globalState.period ?? 1,
    timeStr: globalState.timeStr ?? '',
    selectedLabels: globalState.selectedLabels ?? [],
    memo: initialMemo ?? globalState.memo ?? '',
    phase: initialPhase,
    isModalOpen: true,
  };

  return (
    <MemoOverlayStoreProvider initialState={memoInitialState}>
      <MemoOverlayModalInner
        matchId={matchId}
        initialMemo={initialMemo}
        onClose={handleClose}
      />
    </MemoOverlayStoreProvider>
  );
}
