import type React from 'react';
import { useEffect } from 'react';
import { MemoOverlayView } from '@/components/features/memo-overlay/MemoOverlayView';
import { useMemoOverlayEventBridge } from '@/hooks/features/memo-overlay/useMemoOverlayEventBridge';
import {
  createSavePayload,
  getValidationError,
} from '@/lib/features/memo-overlay/memoOverlayLogic';
import { useMemoOverlayStore } from '@/stores/memo-overlay-store';
import { DEBUG_CONFIG } from '../../constants';
import { addToSaveQueue } from '../../features/storage-sync/save-queue';
import { useOverlayStore } from '../../stores/useOverlayStore';

/**
 * MemoOverlayBridge (Extension Adapter Layer)
 *
 * 責務: 拡張機能固有のI/Oをコア（Hook + View）に繋ぐ「接着剤」。
 *
 * フェーズ2の変更点:
 * - 保存処理を `sendMessage('SAVE_MEMO_RELAY')` から
 *   `chrome.storage.local` のキューへの書き込みに変更。
 * - Content Script が `storage.onChanged` でキューを監視し、
 *   IndexedDB への実書き込みと REFRESH_APP の通知を担う。
 */
export const MemoOverlayBridge: React.FC = () => {
  const {
    isVisible,
    mode,
    matchId,
    initialData,
    initialError,
    open,
    close,
    setToast,
  } = useOverlayStore();

  const reset = useMemoOverlayStore((s) => s.reset);
  const setError = useMemoOverlayStore((s) => s.setError);
  const setTimeStr = useMemoOverlayStore((s) => s.setTimeStr);
  const setSelectedLabels = useMemoOverlayStore((s) => s.setSelectedLabels);
  const setMemo = useMemoOverlayStore((s) => s.setMemo);
  const setEventId = useMemoOverlayStore((s) => s.setEventId);
  const setPeriod = useMemoOverlayStore((s) => s.setPeriod);
  const forceSetPhase = useMemoOverlayStore((s) => s.forceSetPhase);
  const setIsSaving = useMemoOverlayStore((s) => s.setIsSaving);

  // ── ストアの初期化 ──
  useEffect(() => {
    if (!isVisible) return;

    reset(mode);

    if (initialError) {
      setError(initialError);
    }

    if (initialData) {
      if (mode === 'EVENT') {
        if (initialData.id) {
          setEventId(initialData.id);
        }
        if (initialData.period) {
          setPeriod(initialData.period);
        }
        if (initialData.minute !== undefined) {
          const m = initialData.minute;
          const s = initialData.second ?? 0;
          setTimeStr(`${m}:${s.toString().padStart(2, '0')}`);
          // 時間が入力された状態なのでフェーズを進める
          forceSetPhase(1);
        }
        if (initialData.labels) {
          setSelectedLabels(initialData.labels);
          // ラベルも入力済みならメモフェーズへ
          forceSetPhase(2);
        }
      }
      if (initialData.memo) {
        setMemo(initialData.memo);
      }
    }
  }, [
    isVisible,
    mode,
    initialData,
    initialError,
    reset,
    setError,
    setTimeStr,
    setSelectedLabels,
    setMemo,
    setEventId,
    setPeriod,
    forceSetPhase,
  ]);

  // ── バリデーションヘルパー ──
  const validate = (state: ReturnType<typeof useMemoOverlayStore.getState>) => {
    if (state.mode === 'EVENT') {
      // Phase 0: 時間のチェック
      const timeErr = getValidationError({ ...state, phase: 0 });
      if (timeErr) {
        setError(timeErr);
        forceSetPhase(0);
        return false;
      }
      // Phase 1: ラベルのチェック
      const labelErr = getValidationError({ ...state, phase: 1 });
      if (labelErr) {
        setError(labelErr);
        forceSetPhase(1);
        return false;
      }
    }
    return true;
  };

  // ── 保存処理（Storage Queue への書き込み） ──
  const handleSave = async () => {
    const currentState = useMemoOverlayStore.getState();

    // 二重実行防止（保存処理中は入力を受け付けない）
    if (currentState.isSaving) return;

    if (!DEBUG_CONFIG.DRY_RUN && !matchId) {
      setError('保存先の試合情報が見つかりません。');
      return;
    }

    if (!validate(currentState)) return;

    const payload = createSavePayload({
      mode: currentState.mode,
      period: currentState.period,
      timeStr: currentState.timeStr,
      selectedLabels: currentState.selectedLabels,
      memo: currentState.memo,
    });

    if (!payload) return;

    setIsSaving(true);
    try {
      if (DEBUG_CONFIG.DRY_RUN) {
        console.info('🚀 [DRY RUN] Save Payload:', { matchId, ...payload });
        await new Promise((resolve) => setTimeout(resolve, 500));
        setToast('Dry Run: Saved');
        reset();
        return;
      }

      // Save Queue に追加（共通サービスに委譲）
      await addToSaveQueue({
        mode: currentState.mode,
        matchId: matchId!,
        period: currentState.period,
        memo: payload.memo,
        entityId: currentState.eventId,
        ...(payload.type === 'EVENT'
          ? {
              minute: payload.minute,
              second: payload.second,
              labels: payload.labels,
            }
          : {}),
      });

      // キューへの書き込み完了をもってUIに成功フィードバックを返す
      // 実際のDB書き込みはContent Scriptが担う
      close();
      setToast(
        currentState.mode === 'MATCH'
          ? 'Match Memo Saved'
          : 'Saved Successfully',
      );
    } catch (err) {
      console.error('[MemoOverlayBridge] Queue write failed:', err);
      setError('保存キューへの書き込みに失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  // ストア連携
  useMemoOverlayEventBridge(close, handleSave, open, isVisible);

  if (!isVisible) return null;

  return (
    <MemoOverlayView
      matchId={matchId}
      onClose={close}
      onSave={handleSave}
      readOnly={false}
    />
  );
};
