import hotkeys from 'hotkeys-js';
import { useEffect } from 'react';
import { useMemoOverlayStore } from '@/features/memo-overlay';
import { QUICK_TAGS } from '../../../constants/quick-tags';
import { useOverlayStore } from '../stores/use-overlay-store';

/**
 * useOverlayShortcutInterceptor
 *
 * 責務: グローバルなキーボードショートカットを登録する。
 * - Escape: オーバーレイを閉じる
 * - Ctrl+Enter / Cmd+Enter: メモ保存
 * - 1〜4: EVENT モード時にプリセットクイックタグをトグル選択（input/textarea外のみ）
 *
 * 各フェーズの詳細なキー操作（Backspace, Arrow, Enter等）は、
 * 各フェーズコンポーネントのローカルな onKeyDown ハンドラに委譲する。
 */
export function useOverlayShortcutInterceptor() {
  useEffect(() => {
    // hotkeys-js が input/textarea 内でも動作するように設定
    const originalFilter = hotkeys.filter;
    hotkeys.filter = () => true;

    const isInputFocused = (e: KeyboardEvent) => {
      const target = (e.target || (e as any).srcElement) as HTMLElement | null;
      return (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable
      );
    };

    hotkeys('escape', (e) => {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent('footics-action', {
          detail: { action: 'CLOSE_OVERLAY' },
        }),
      );
    });

    hotkeys('ctrl+enter, command+enter', (e) => {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent('footics-action', {
          detail: { action: 'SAVE_MEMO' },
        }),
      );
    });

    hotkeys('alt+m', (e) => {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent('footics-action', {
          detail: { action: 'TOGGLE_DISPLAY_MODE' },
        }),
      );
    });

    // 数字キー (1〜4) によるタグクイック選択
    for (const tag of QUICK_TAGS) {
      hotkeys(tag.shortcut, (e) => {
        if (isInputFocused(e)) return;

        const overlayState = useOverlayStore.getState();
        if (!overlayState.isVisible || overlayState.mode !== 'EVENT') return;

        e.preventDefault();
        const memoStore = useMemoOverlayStore.getState();
        const currentLabels = memoStore.selectedLabels;
        if (currentLabels.includes(tag.label)) {
          memoStore.setSelectedLabels(
            currentLabels.filter((l) => l !== tag.label),
          );
        } else {
          memoStore.addLabel(tag.label);
        }
      });
    }

    return () => {
      hotkeys.filter = originalFilter;
      hotkeys.unbind('escape');
      hotkeys.unbind('ctrl+enter');
      hotkeys.unbind('command+enter');
      hotkeys.unbind('alt+m');
      for (const tag of QUICK_TAGS) {
        hotkeys.unbind(tag.shortcut);
      }
    };
  }, []);
}
