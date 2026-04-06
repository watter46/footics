import { useEffect, useRef } from 'react';

interface UseOverlayShortcutInterceptorProps {
  isVisible: boolean;
}

/**
 * useOverlayShortcutInterceptor
 * 
 * 責務: オーバーレイ表示中に特定のキー入力をキャプチャし、
 * `footics-action` カスタムイベントとしてディスパッチする。
 */
export function useOverlayShortcutInterceptor({ isVisible }: UseOverlayShortcutInterceptorProps) {
  // state への依存を最小限にするため Ref を使用する場合もあるが、
  // ここでは isVisible の変化に反応してイベントリスナーを制御する。
  
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const hijackedKeys = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Tab', 'Escape', 'Enter', ' ', 'Backspace',
        '1', '2', '3', '4', '5', '6',
      ];

      const isSaveCombo = e.key === 'Enter' && (e.ctrlKey || e.metaKey);
      if (!hijackedKeys.includes(e.key) && !isSaveCombo) return;

      // 重大な副作用を防ぐために伝播を停止
      e.stopImmediatePropagation();
      e.preventDefault();

      let action = '';
      const detail: Record<string, unknown> = {
        key: e.key,
        code: e.code,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
      };

      if (e.isComposing) return; // IME 入力中は無視

      if (e.key === 'Backspace') {
        action = 'BACKSPACE';
      } else if (isSaveCombo) {
        action = 'SAVE_MEMO';
      } else if (e.key === 'Enter') {
        action = 'NEXT_PHASE';
      } else if (e.key === 'Escape') {
        action = 'CLOSE_OVERLAY';
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        action = 'NAVIGATE_SUGGESTION';
      } else if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        action = 'FILTER_CATEGORY';
        detail.categoryIndex = parseInt(e.key) - 1;
      } else if (e.key === 'Tab') {
        action = e.shiftKey ? 'PREV_PHASE' : 'NEXT_PHASE';
      }

      if (action) {
        window.dispatchEvent(new CustomEvent('footics-action', { detail: { action, ...detail } }));
      }
    };

    // キャプチャフェーズで登録して、ページ側のリスナーより先に実行させる
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isVisible]);
}
