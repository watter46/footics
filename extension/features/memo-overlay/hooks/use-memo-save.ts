import { useMemoOverlayStoreApi } from '@/features/memo-overlay';
import type { MemoOverlayState } from '@/features/memo-overlay/stores/memo-overlay-types';
import {
  createSavePayload,
  getValidationError,
} from '@/lib/features/memo-overlay/memoOverlayLogic';
import { DEBUG_CONFIG } from '~/constants';
import { addToSaveQueue } from '~/features/storage-sync/save-queue';
import { useOverlayStore } from '../stores/use-overlay-store';

/**
 * useMemoSave
 *
 * 責務: メモオーバーレイ（フルモード/ミニモード共通）の保存処理・バリデーション。
 * Save Queue へのエンキューおよび成功トーストの表示を担う。
 */
export function useMemoSave() {
  const { matchId, close, setToast } = useOverlayStore();
  const storeApi = useMemoOverlayStoreApi();

  const validate = (state: MemoOverlayState): boolean => {
    if (state.mode === 'EVENT') {
      const timeErr = getValidationError({ ...state, phase: 0 });
      if (timeErr) {
        storeApi.getState().setError(timeErr);
        storeApi.getState().forceSetPhase(0);
        return false;
      }
      const labelErr = getValidationError({ ...state, phase: 1 });
      if (labelErr) {
        storeApi.getState().setError(labelErr);
        storeApi.getState().forceSetPhase(1);
        return false;
      }
    }
    return true;
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Save flow handles validation, dry run, and queueing
  const handleSave = async () => {
    const currentState = storeApi.getState();

    if (currentState.isSaving) return;

    if (!DEBUG_CONFIG.DRY_RUN && !matchId) {
      currentState.setError('保存先の試合情報が見つかりません。');
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

    currentState.setIsSaving(true);
    try {
      if (DEBUG_CONFIG.DRY_RUN) {
        console.info('🚀 [DRY RUN] Save Payload:', { matchId, ...payload });
        await new Promise((resolve) => setTimeout(resolve, 500));
        setToast('Dry Run: Saved');
        currentState.reset();
        return;
      }

      await addToSaveQueue({
        mode: currentState.mode,
        matchId: matchId ?? '',
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

      close();
      setToast(
        currentState.mode === 'MATCH'
          ? 'Match Memo Saved'
          : 'Saved Successfully',
      );
    } catch (err) {
      console.error('[useMemoSave] Queue write failed:', err);
      currentState.setError('保存キューへの書き込みに失敗しました。');
    } finally {
      currentState.setIsSaving(false);
    }
  };

  return { handleSave, validate };
}
