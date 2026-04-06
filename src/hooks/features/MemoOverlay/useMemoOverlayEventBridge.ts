import { useEffect } from "react";
import type { MemoOverlayActions, MemoOverlayState } from "./useMemoOverlay";

/**
 * useMemoOverlayEventBridge
 *
 * 責務: `window` の `footics-action` カスタムイベントを監視し、
 * `useMemoOverlay` のアクションへ橋渡しする。
 *
 * このHookは拡張機能・本体アプリ問わず、イベント駆動の操作連携を提供する。
 * ただし `browser` グローバルは使用しないため環境に依存しない。
 */
export function useMemoOverlayEventBridge(
  state: MemoOverlayState,
  actions: MemoOverlayActions,
  onClose: () => void,
  onSave: () => void,
) {
  useEffect(() => {
    const handleFooticsAction = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        action: string;
        categoryIndex?: number;
        key?: string;
        shiftKey?: boolean;
      };
      const { action } = detail;

      switch (action) {
        case "CLOSE_OVERLAY":
          onClose();
          break;

        case "SAVE_MEMO":
          onSave();
          break;

        case "NEXT_PHASE": {
          if (state.mode === "EVENT") {
            const result = actions.nextPhase();
            if (result === "BLOCKED") return;
          } else {
            onSave();
          }
          break;
        }

        case "PREV_PHASE":
          actions.prevPhase();
          break;

        case "BACKSPACE":
          if (state.mode === "EVENT") {
            if (state.phase === 0) {
              actions.backspaceTimeStr();
            } else if (state.phase === 1) {
              actions.backspaceLabel();
            }
          }
          break;

        case "NAVIGATE_SUGGESTION":
          if (state.mode === "EVENT" && state.phase === 1) {
            const direction = detail.key === "ArrowDown" ? 1 : -1;
            actions.navigateSuggestion(direction);
          }
          break;

        case "FILTER_CATEGORY":
          if (state.mode === "EVENT" && typeof detail.categoryIndex === "number") {
            actions.filterByCategory(detail.categoryIndex);
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener("footics-action", handleFooticsAction);
    return () => window.removeEventListener("footics-action", handleFooticsAction);
  }, [
    state.mode,
    state.phase,
    state.suggestions,
    state.suggestionIndex,
    state.isListMode,
    state.labelInput,
    state.validationError,
    actions,
    onClose,
    onSave,
  ]);
}
