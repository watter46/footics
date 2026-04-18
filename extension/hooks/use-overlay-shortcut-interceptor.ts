import { useEffect, useRef } from 'react';
import { useMemoOverlayStore } from '@/stores/useMemoOverlayStore';

interface UseOverlayShortcutInterceptorProps {
  isVisible: boolean;
}

/**
 * useOverlayShortcutInterceptor
 *
 * 責務: オーバーレイ表示中に特定のキー入力をキャプチャし、
 * `footics-action` カスタムイベントとしてディスパッチする。
 * また、フェーズ3（メモ入力）等においてホストページ（動画プレイヤー等）への
 * キー漏れを防ぐため、イベントの遮断と入力のエミュレーションを行う。
 */
export function useOverlayShortcutInterceptor({
  isVisible,
}: UseOverlayShortcutInterceptorProps) {
  useEffect(() => {
    if (!isVisible) return;

    const handleEvent = (e: KeyboardEvent) => {
      // 重複処理の防止
      if ((e as any)._footics_processed) return;

      const hijackedKeys = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Tab',
        'Escape',
        'Enter',
        ' ',
        'Backspace',
        'Delete',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
      ];

      const isSaveCombo = e.key === 'Enter' && (e.ctrlKey || e.metaKey);
      if (!hijackedKeys.includes(e.key) && !isSaveCombo) return;

      const path = e.composedPath();
      const realTarget = path[0] as HTMLElement;
      const isTextarea = realTarget.tagName === 'TEXTAREA';
      const store = useMemoOverlayStore.getState();
      const isPhase3 = store.phase === 2;

      // --- [強力なアイソレーションロジック] ---
      // フェーズ3（メモ入力）のテキストエリア内では、ホストページ側のリスナーや
      // ブラウザのデフォルト動作が動画プレイヤー等に干渉するのを防ぐため、
      // イベントを完全に遮断し、必要に応じて入力をプログラムでエミュレートする。
      if (isPhase3 && isTextarea) {
        const isNavigationKey = e.key === 'Tab' || e.key === 'Escape';

        if (!isNavigationKey && !isSaveCombo) {
          // 強制的に全ての伝播とデフォルト動作を停止（ホスト側を沈黙させる）
          e.stopImmediatePropagation();
          e.preventDefault();

          // keydown 時のみ、実際の入力をエミュレートする
          if (e.type === 'keydown') {
            const ta = realTarget as HTMLTextAreaElement;
            if (e.key.length === 1) {
              // 通常の文字入力（スペース、数字含む）
              document.execCommand('insertText', false, e.key);
            } else if (e.key === 'Enter') {
              // 改行
              document.execCommand('insertLineBreak');
            } else if (e.key === 'Backspace') {
              // 削除
              document.execCommand('delete');
            } else if (e.key === 'Delete') {
              // 前方削除
              document.execCommand('forwardDelete');
            } else if (e.key === 'ArrowLeft') {
              const pos = Math.max(0, ta.selectionStart - 1);
              ta.setSelectionRange(pos, pos);
            } else if (e.key === 'ArrowRight') {
              const pos = Math.min(ta.value.length, ta.selectionStart + 1);
              ta.setSelectionRange(pos, pos);
            } else if (e.key === 'ArrowUp') {
              // 上移動（簡易的。行を考慮する場合はさらに複雑になるが、一旦基本的な移動は許可）
              // ※ volume up などを防ぐために preventDefault は維持
            } else if (e.key === 'ArrowDown') {
              // 下移動
            }
          }
          return;
        }
      }

      // --- [既存のシステムアクション処理] ---
      // keydown 以外は無視（システムアクションは単発発火で良いため）
      if (e.type !== 'keydown') return;

      // 重大な副作用を防ぐために伝播を停止（Phase 0/1 またはシステムショートカット時）
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
        // フェーズ1/2では Enter は「次へ」を意味する
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
        window.dispatchEvent(
          new CustomEvent('footics-action', { detail: { action, ...detail } }),
        );
      }
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
