import type React from 'react';
import { useEffect } from 'react';
import { browser } from 'wxt/browser';
import { MemoOverlayView } from '@/components/features/MemoOverlay/MemoOverlayView';
import { useMemoOverlayEventBridge } from '@/hooks/features/MemoOverlay/useMemoOverlayEventBridge';
import {
  createSavePayload,
  getValidationError,
  type MemoMode,
} from '@/lib/features/MemoOverlay/memoOverlayLogic';
import { useMemoOverlayStore } from '@/stores/useMemoOverlayStore';
import { useOverlayStore } from '../../stores/useOverlayStore';
import { DEBUG_CONFIG } from '../../constants';
import {
  ExtensionMessageSchema,
  SaveMemoResponseSchema,
} from '../../types/schemas';

/**
 * MemoOverlayBridge (Extension Adapter Layer)
 *
 * 責務: 拡張機能固有のI/Oをコア（Hook + View）に繋ぐ「接着剤」。
 */
export const MemoOverlayBridge: React.FC = () => {
  const { mode, matchId, initialError, close, setToast } = useOverlayStore();
  const store = useMemoOverlayStore();

  // ── ストアの初期化 ──
  useEffect(() => {
    store.reset(mode);
    if (initialError) {
      store.setError(initialError);
    }
  }, [mode, initialError, store.setError, store.reset]);

  // ── バリデーションヘルパー ──
  const validate = (state: ReturnType<typeof useMemoOverlayStore.getState>) => {
    if (state.mode === 'EVENT') {
      // Phase 0: 時間のチェック
      const timeErr = getValidationError({ ...state, phase: 0 });
      if (timeErr) {
        store.setError(timeErr);
        store.forceSetPhase(0);
        return false;
      }
      // Phase 1: ラベルのチェック
      const labelErr = getValidationError({ ...state, phase: 1 });
      if (labelErr) {
        store.setError(labelErr);
        store.forceSetPhase(1);
        return false;
      }
    }
    return true;
  };

  // ── 保存処理（Extension 固有の実装） ──
  const handleSave = async () => {
    const currentState = useMemoOverlayStore.getState();

    if (!DEBUG_CONFIG.DRY_RUN && !matchId) {
      store.setError('保存先の試合情報が見つかりません。');
      return;
    }

    if (!validate(currentState)) return;

    const payload = createSavePayload({
      mode: currentState.mode,
      timeStr: currentState.timeStr,
      selectedLabels: currentState.selectedLabels,
      memo: currentState.memo,
    });

    if (!payload) return;

    store.setIsSaving(true);
    try {
      if (DEBUG_CONFIG.DRY_RUN) {
        console.info('🚀 [DRY RUN] Save Payload:', { matchId, ...payload });
        await new Promise((resolve) => setTimeout(resolve, 500));
        setToast('Dry Run: Saved');
        store.reset();
        return;
      }

      const rawMessage = {
        type: 'SAVE_MEMO_RELAY',
        mode: currentState.mode,
        matchId: matchId!,
        memo: payload.memo,
        ...(payload.type === 'EVENT'
          ? {
              minute: payload.minute,
              second: payload.second,
              labels: payload.labels,
            }
          : {}),
      };

      const messageResult = ExtensionMessageSchema.safeParse(rawMessage);
      if (!messageResult.success) {
        console.error(
          '[MemoOverlayBridge] Invalid payload:',
          messageResult.error,
        );
        store.setError('内部エラーが発生しました。');
        return;
      }

      const rawResponse = await browser.runtime.sendMessage(messageResult.data);
      const response = SaveMemoResponseSchema.safeParse(rawResponse).data;

      if (response?.success) {
        close();
        setToast('Saved Successfully');
      } else {
        store.setError(
          response?.error || '保存に失敗しました。本体タブを確認してください。',
        );
      }
    } catch (err) {
      console.error('[MemoOverlayBridge] sendMessage failed:', err);
      store.setError('通信エラーが発生しました。');
    } finally {
      store.setIsSaving(false);
    }
  };

  // ストア連携
  useMemoOverlayEventBridge(close, handleSave);

  return (
    <MemoOverlayView matchId={matchId} onClose={close} onSave={handleSave} />
  );
};
