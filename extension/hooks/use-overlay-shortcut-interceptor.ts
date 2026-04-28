import hotkeys from 'hotkeys-js';
import { useEffect } from 'react';

/**
 * useOverlayShortcutInterceptor
 *
 * 責務: グローバルなキーボードショートカットを最小限に登録する。
 * - Escape: オーバーレイを閉じる（入力フィールド以外でのみ発火）
 *
 * 各フェーズの詳細なキー操作（Backspace, Arrow, Enter等）は、
 * 各フェーズコンポーネントのローカルな onKeyDown ハンドラに委譲する。
 * これにより textarea 等での標準ブラウザ挙動を妨げない。
 *
 * Note: hotkeys-js のデフォルトフィルターは input/textarea/select に
 * フォーカスがある場合にイベントを発火しない。この仕様を活用している。
 */
export function useOverlayShortcutInterceptor() {
  useEffect(() => {
    // hotkeys-js のデフォルトフィルター:
    // input, textarea, select にフォーカスがある場合はイベントを発火しない
    // → Escape はフォーカスが input 外にある場合のみ発火する（安全）

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

    return () => {
      hotkeys.unbind('escape');
      hotkeys.unbind('ctrl+enter');
      hotkeys.unbind('command+enter');
    };
  }, []);
}
