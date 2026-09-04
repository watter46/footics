import { useEffect, useRef } from 'react';
import { onMessage } from 'webext-bridge/content-script';
import { cn } from '../../../utils/cn';
import { findVideoElement } from '../../capture/drm-capture-engine';
import { useOverlayShortcutInterceptor } from '../hooks/use-overlay-shortcut-interceptor';
import { MemoOverlayBridge } from '../memo-overlay-bridge';
import { useOverlayStore } from '../stores/use-overlay-store';
import { SuccessToast } from './success-toast';

export const OverlayApp = () => {
  const { isVisible, toast, mode, open, close } = useOverlayStore();
  const activeElementRef = useRef<HTMLElement | null>(null);

  // キーボード入力をキャプチャして footics-action に変換するロジックを分離
  useOverlayShortcutInterceptor();

  useEffect(() => {
    // Background からのメッセージを受信
    return onMessage('OPEN_OVERLAY', ({ data }) => {
      // 同モードで既に開いていればトグルで閉じる
      if (isVisible && mode === data.mode) {
        close();
      } else {
        // 開く直前に、現在フォーカスされている要素を記憶
        if (
          document.activeElement &&
          document.activeElement !== document.body
        ) {
          activeElementRef.current = document.activeElement as HTMLElement;
          console.log(
            '[Footics Overlay] Captured active element before open:',
            activeElementRef.current,
          );
        } else {
          activeElementRef.current = null;
        }

        open({
          mode: data.mode,
          matchId: data.matchId,
          error: data.error,
          initialData: data.initialData,
        });
      }
    });
  }, [isVisible, mode, open, close]);

  // 閉じたときのフォーカス復元を処理する useEffect
  useEffect(() => {
    if (!isVisible) {
      // 閉じたとき、記憶していた要素にフォーカスを戻す
      if (activeElementRef.current) {
        console.log(
          '[Footics Overlay] Restoring focus to:',
          activeElementRef.current,
        );
        activeElementRef.current.focus();
        activeElementRef.current = null;
      } else {
        // フォールバック：Shadow DOMを含むページ内の video 要素を探してフォーカス
        const video = findVideoElement();
        if (video) {
          console.log(
            '[Footics Overlay] Fallback: Focusing found video element',
          );
          video.focus();
        }
      }
    }
  }, [isVisible]);

  return (
    <div className={cn('footics-overlay-host')}>
      <SuccessToast message={toast.message} isVisible={toast.visible} />

      {/* Main Overlay */}
      {isVisible && (
        <div className={cn('footics-overlay-root')}>
          <MemoOverlayBridge />
        </div>
      )}
    </div>
  );
};
