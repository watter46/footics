import { useEffect } from 'react';
import { useMemoOverlayStore } from '@/features/memo-overlay/stores/memo-overlay-store';
import { QUICK_TAGS } from '../../../constants/quick-tags';
import { useOverlayStore } from '../stores/use-overlay-store';

/**
 * useOverlayShortcutInterceptor
 *
 * 責務: グローバルなキーボードショートカットをキャプチャフェーズで登録する。
 * - Escape: オーバーレイを閉じる
 * - Ctrl+Enter / Cmd+Enter: メモ保存
 * - Alt+M: 表示モード切替
 * - Alt+S: キャプチャトリガー
 * - 1〜4: EVENT モード時にプリセットクイックタグをトグル選択（input/textarea外のみ）
 */
export function useOverlayShortcutInterceptor() {
  useEffect(() => {
    const isInputFocused = (e: KeyboardEvent) => {
      const target =
        typeof e.composedPath === 'function' ? e.composedPath()[0] : e.target;
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: オーバーレイを閉じる
      if (e.key === 'Escape') {
        e.preventDefault();
        window.postMessage(
          { type: 'FOOTICS_ACTION', action: 'CLOSE_OVERLAY' },
          '*',
        );
        return;
      }

      // Ctrl+Enter / Cmd+Enter: メモ保存
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        window.postMessage(
          { type: 'FOOTICS_ACTION', action: 'SAVE_MEMO' },
          '*',
        );
        return;
      }

      // Alt+M: 表示モード切替
      if (e.altKey && (e.key === 'm' || e.key === 'M' || e.code === 'KeyM')) {
        e.preventDefault();
        window.postMessage(
          { type: 'FOOTICS_ACTION', action: 'TOGGLE_DISPLAY_MODE' },
          '*',
        );
        return;
      }

      // Alt+S: キャプチャトリガー
      if (e.altKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS')) {
        e.preventDefault();
        window.postMessage({ type: 'FOOTICS_TRIGGER_CAPTURE' }, '*');
        return;
      }

      // 数字キー (1〜4) によるタグクイック選択
      if (
        !isInputFocused(e) &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.shiftKey
      ) {
        const matchingTag = QUICK_TAGS.find((tag) => tag.shortcut === e.key);
        if (matchingTag) {
          const overlayState = useOverlayStore.getState();
          if (overlayState.isVisible && overlayState.mode === 'EVENT') {
            e.preventDefault();
            const memoStore = useMemoOverlayStore.getState();
            const currentLabels = memoStore.selectedLabels;
            if (currentLabels.includes(matchingTag.label)) {
              memoStore.setSelectedLabels(
                currentLabels.filter((l) => l !== matchingTag.label),
              );
            } else {
              memoStore.addLabel(matchingTag.label);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);
}
