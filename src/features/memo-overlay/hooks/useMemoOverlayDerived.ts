import { getFlattenedEvents } from '@/lib/event-definitions';
import {
  filterSuggestions,
  parseTimeStr,
} from '@/lib/features/memo-overlay/memoOverlayLogic';
import { useMemoOverlayContext } from '../stores/memo-overlay-provider';

/**
 * useMemoOverlayDerived
 * 責務: MemoOverlayStore の値から導出される表示用状態・ヘルパーを提供するカスタムフック。
 */
export const useMemoOverlayDerived = () => {
  const store = useMemoOverlayContext();
  const flattenedEvents = getFlattenedEvents();

  const formattedTime = parseTimeStr(store.timeStr, store.period);
  const suggestions = filterSuggestions(store.labelInput, flattenedEvents);

  const isInvalidLabel = store.labelInput
    ? !suggestions.some(
        (s) => s.label.toLowerCase() === store.labelInput.toLowerCase(),
      )
    : false;

  const clearError = () => store.setError(undefined);

  return {
    ...store,
    formattedTime,
    suggestions,
    isInvalidLabel,
    clearError,
  };
};
