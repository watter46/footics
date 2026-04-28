import type React from 'react';
import { useEffect } from 'react';
import { MemoOverlayView } from '@/components/features/MemoOverlay/MemoOverlayView';
import { useMemoOverlayEventBridge } from '@/hooks/features/MemoOverlay/useMemoOverlayEventBridge';
import {
  createSavePayload,
  getValidationError,
} from '@/lib/features/MemoOverlay/memoOverlayLogic';
import { useMemoOverlayStore } from '@/stores/useMemoOverlayStore';
import { DEBUG_CONFIG, STORAGE_KEYS } from '../../constants';
import { useOverlayStore } from '../../stores/useOverlayStore';
import { type SaveQueueItem, SaveQueueSchema } from '../../types/schemas';

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

  // ── 保存処理（Storage Queue への書き込み） ──
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

      // Storage Queue にアイテムを追加
      const newItem: SaveQueueItem = {
        id: crypto.randomUUID(),
        status: 'pending',
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
        createdAt: Date.now(),
      };

      // 既存のキューを読み込んで新しいアイテムを追加
      const stored = await browser.storage.local.get(STORAGE_KEYS.SAVE_QUEUE);
      const rawQueue = stored[STORAGE_KEYS.SAVE_QUEUE];
      const parsed = SaveQueueSchema.safeParse(rawQueue);
      const currentQueue = parsed.success ? parsed.data : [];

      await browser.storage.local.set({
        [STORAGE_KEYS.SAVE_QUEUE]: [...currentQueue, newItem],
      });

      console.info('[MemoOverlayBridge] Queued save item:', newItem.id);

      // キューへの書き込み完了をもってUIに成功フィードバックを返す
      // 実際のDB書き込みはContent Scriptが担う
      close();
      setToast('Saved Successfully');
    } catch (err) {
      console.error('[MemoOverlayBridge] Queue write failed:', err);
      store.setError('保存キューへの書き込みに失敗しました。');
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
