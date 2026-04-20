import { useEffect } from 'react';
import { useMemoOverlayStore } from '@/stores/useMemoOverlayStore';
import { CATEGORY_KEYS, HIJACKED_KEYS } from '../constants';
import { useOverlayStore } from '../stores/useOverlayStore';
import { FooticsActionSchema } from '../types/schemas';
import { handleTextareaIsolation } from './use-textarea-isolation';

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
      if (
        '_footics_processed' in e &&
        (e as KeyboardEvent & { _footics_processed: boolean })
          ._footics_processed
      )
        return;

      const isSaveCombo = e.key === 'Enter' && (e.ctrlKey || e.metaKey);

      // 指定されたキー以外、かつ保存コンボでもない場合は無視
      if (
        !HIJACKED_KEYS.includes(e.key as (typeof HIJACKED_KEYS)[number]) &&
        !isSaveCombo
      ) {
        return;
      }

      const path = e.composedPath();
      const realTarget = path[0] as HTMLElement;
      const isTextarea = realTarget.tagName === 'TEXTAREA';
      const store = useMemoOverlayStore.getState();
      const isPhase3 = store.phase === 2;

      // --- [強力なアイソレーションロジック] ---
      // メモ入力フェーズかつ Textarea フォーカス時のみ隔離ロジックを適用
      if (isPhase3 && isTextarea) {
        const { shouldStop, shouldPrevent } = handleTextareaIsolation(
          e,
          realTarget as HTMLTextAreaElement,
          isSaveCombo,
        );

        if (shouldStop) {
          e.stopImmediatePropagation();
        }
        if (shouldPrevent) {
          e.preventDefault();
        }

        // 隔離モードで処理された場合でも、アクション判定（保存コンボ等）は継続する可能性があるが、
        // 文字入力自体はブラウザに任せるため、ここで return する
        if (shouldStop || shouldPrevent) {
          if (isSaveCombo) {
            // 保存コンボだけはアクションとして実行する
            dispatchAction(e, isSaveCombo);
            e.preventDefault(); // デフォルト（改行等）を防ぐ
          }
          return;
        }
      }

      // --- [既存のシステムアクション処理] ---
      if (e.type !== 'keydown') return;

      // ホストページへの伝播を完全に遮断
      e.stopImmediatePropagation();
      e.preventDefault();

      dispatchAction(e, isSaveCombo);
    };

    // keydown, keyup, keypress 全てに対して同様のハンドラを登録（Captureフェーズ）
    // 注意: 他の拡張機能やビデオプレイヤーのリスナーより先に実行するため capture: true
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
