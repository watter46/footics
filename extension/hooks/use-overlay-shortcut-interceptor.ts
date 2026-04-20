import { useEffect } from 'react';
import { useMemoOverlayStore } from '@/stores/useMemoOverlayStore';
import { CATEGORY_KEYS, HIJACKED_KEYS } from '../constants';
import { useOverlayStore } from '../stores/useOverlayStore';
import { FooticsActionSchema } from '../types/schemas';

/**
 * useOverlayShortcutInterceptor
 *
 * 責務: オーバーレイ表示中に特定のキー入力をキャプチャし、
 * `footics-action` カスタムイベントとしてディスパッチする。
 */
export function useOverlayShortcutInterceptor() {
  const isVisible = useOverlayStore((state) => state.isVisible);

  useEffect(() => {
    if (!isVisible) return;

    const handleEvent = (e: KeyboardEvent) => {
      // 重複処理の防止
      if ('_footics_processed' in e && e._footics_processed) return;

      const isSaveCombo = e.key === 'Enter' && (e.ctrlKey || e.metaKey);
      if (
        !HIJACKED_KEYS.includes(e.key as (typeof HIJACKED_KEYS)[number]) &&
        !isSaveCombo
      )
        return;

      const path = e.composedPath();
      const realTarget = path[0] as HTMLElement;
      const isTextarea = realTarget.tagName === 'TEXTAREA';
      const store = useMemoOverlayStore.getState();
      const isPhase3 = store.phase === 2;

      // --- [強力なアイソレーションロジック] ---
      if (isPhase3 && isTextarea) {
        if (handleIsolation(e, realTarget as HTMLTextAreaElement, isSaveCombo))
          return;
      }

      // --- [既存のシステムアクション処理] ---
      if (e.type !== 'keydown') return;

      // 重大な副作用を防ぐために伝播を停止
      e.stopImmediatePropagation();
      e.preventDefault();

      dispatchAction(e, isSaveCombo);
    };

    // keydown, keyup, keypress 全てに対して同様のハンドラを登録（Captureフェーズ）
    window.addEventListener('keydown', handleEvent, { capture: true });
    window.addEventListener('keyup', handleEvent, { capture: true });
    window.addEventListener('keypress', handleEvent, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleEvent, { capture: true });
      window.removeEventListener('keyup', handleEvent, { capture: true });
      window.removeEventListener('keypress', handleEvent, { capture: true });
    };
  }, [isVisible]);
}

/**
 * フェーズ3（メモ入力）での入力をエミュレートし、ホストページへの干渉を遮断する
 */
function handleIsolation(
  e: KeyboardEvent,
  ta: HTMLTextAreaElement,
  isSaveCombo: boolean,
): boolean {
  const isNavigationKey = e.key === 'Tab' || e.key === 'Escape';

  if (!isNavigationKey && !isSaveCombo) {
    e.stopImmediatePropagation();
    e.preventDefault();

    if (e.type === 'keydown') {
      if (e.key.length === 1) {
        document.execCommand('insertText', false, e.key);
      } else if (e.key === 'Enter') {
        document.execCommand('insertLineBreak');
      } else if (e.key === 'Backspace') {
        document.execCommand('delete');
      } else if (e.key === 'Delete') {
        document.execCommand('forwardDelete');
      } else if (e.key === 'ArrowLeft') {
        const pos = Math.max(0, ta.selectionStart - 1);
        ta.setSelectionRange(pos, pos);
      } else if (e.key === 'ArrowRight') {
        const pos = Math.min(ta.value.length, ta.selectionStart + 1);
        ta.setSelectionRange(pos, pos);
      }
    }
    return true;
  }
  return false;
}

/**
 * ショートカットキーに応じたアクションをディスパッチする
 */
function dispatchAction(e: KeyboardEvent, isSaveCombo: boolean) {
  let action = '';
  const detail: Record<string, unknown> = {
    key: e.key,
    code: e.code,
    shiftKey: e.shiftKey,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
  };

  if (e.isComposing) return;

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
  } else if (CATEGORY_KEYS.includes(e.key as (typeof CATEGORY_KEYS)[number])) {
    action = 'FILTER_CATEGORY';
    detail.categoryIndex = parseInt(e.key, 10) - 1;
  } else if (e.key === 'Tab') {
    action = e.shiftKey ? 'PREV_PHASE' : 'NEXT_PHASE';
  }

  if (action) {
    const rawData = { type: 'footics-action', detail: { action, ...detail } };
    const result = FooticsActionSchema.safeParse(rawData);

    if (result.success) {
      window.dispatchEvent(
        new CustomEvent('footics-action', { detail: result.data.detail }),
      );
    } else {
      console.warn('[Footics Action] Invalid action data:', result.error);
    }
  }
}
