import { useMemoOverlayStore } from '@/features/memo-overlay/stores/memo-overlay-store';
import {
  createSavePayload,
  getValidationError,
} from '@/lib/features/memo-overlay/memoOverlayLogic';
import { DEBUG_CONFIG } from '../../../constants';
import { addToSaveQueue } from '../../storage-sync/save-queue';
import { useOverlayStore } from '../stores/use-overlay-store';

/**
 * useMemoSave
 *
 * 責務: メモオーバーレイ（フルモード/ミニモード共通）の保存処理・バリデーション。
 * Save Queue へのエンキューおよび成功トーストの表示を担う。
 */
export function useMemoSave() {
  const { matchId, close, setToast } = useOverlayStore();
  const setError = useMemoOverlayStore((s) => s.setError);
  const forceSetPhase = useMemoOverlayStore((s) => s.forceSetPhase);
  const setIsSaving = useMemoOverlayStore((s) => s.setIsSaving);
  const reset = useMemoOverlayStore((s) => s.reset);

  const validate = (
    state: ReturnType<typeof useMemoOverlayStore.getState>,
  ): boolean => {
    if (state.mode === 'EVENT') {
      const timeErr = getValidationError({ ...state, phase: 0 });
      if (timeErr) {
        setError(timeErr);
        forceSetPhase(0);
        return false;
      }
      const labelErr = getValidationError({ ...state, phase: 1 });
      if (labelErr) {
        setError(labelErr);
        forceSetPhase(1);
        return false;
      }
    }
    return true;
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Save flow handles validation, dry run, and queueing
  const handleSave = async () => {
    const currentState = useMemoOverlayStore.getState();

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
      setError('保存キューへの書き込みに失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  return { handleSave, validate };
}
