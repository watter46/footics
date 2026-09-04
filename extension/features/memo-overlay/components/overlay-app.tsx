import { useCallback, useEffect, useRef } from 'react';
import { onMessage } from 'webext-bridge/content-script';
import { cn } from '../../../utils/cn';
import {
  pauseVideoIfPlaying,
  resumeVideoIfWasPaused,
} from '../../../utils/video-controller';
import { findVideoElement } from '../../capture/drm-capture-engine';
import { useOverlayShortcutInterceptor } from '../hooks/use-overlay-shortcut-interceptor';
import { MemoOverlayBridge } from '../memo-overlay-bridge';
import { useOverlayStore } from '../stores/use-overlay-store';
import { MiniMemoPanel } from './mini-memo-panel';
import { SuccessToast } from './success-toast';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Overlay App orchestrates multiple listeners and display modes
export const OverlayApp = () => {
  const { isVisible, displayMode, toast, mode, autoPauseVideo, open, close } =
    useOverlayStore();
  const activeElementRef = useRef<HTMLElement | null>(null);
  const pausedVideoRef = useRef<{
    video: HTMLVideoElement;
    wasPlaying: boolean;
  } | null>(null);

  // キーボード入力をキャプチャして footics-action に変換するロジックを分離
  useOverlayShortcutInterceptor();

  const handleOpenMessage = useCallback(
    (data: {
      mode: typeof mode;
      matchId?: string;
      error?: string;
      initialData?: Parameters<typeof open>[0]['initialData'];
    }) => {
      // 同モードで既に開いていればトグルで閉じる
      if (isVisible && mode === data.mode) {
        close();
        return;
      }

      // 開く直前に、現在フォーカスされている要素を記憶
      if (document.activeElement && document.activeElement !== document.body) {
        activeElementRef.current = document.activeElement as HTMLElement;
        console.log(
          '[Footics Overlay] Captured active element before open:',
          activeElementRef.current,
        );
      } else {
        activeElementRef.current = null;
      }

      // 動画の自動一時停止
      if (autoPauseVideo) {
        const video = findVideoElement();
        if (video) {
          const wasPlaying = pauseVideoIfPlaying(video);
          pausedVideoRef.current = { video, wasPlaying };
        } else {
          pausedVideoRef.current = null;
        }
      } else {
        pausedVideoRef.current = null;
      }

      open({
        mode: data.mode,
        matchId: data.matchId,
        error: data.error,
        initialData: data.initialData,
      });
    },
    [isVisible, mode, autoPauseVideo, open, close],
  );

  useEffect(() => {
    // Background からのメッセージを受信
    const unsubOpen = onMessage('OPEN_OVERLAY', ({ data }) => {
      handleOpenMessage(data);
    });

    const unsubToggleMini = onMessage('TOGGLE_MINI_MODE', () => {
      if (!isVisible) {
        handleOpenMessage({ mode: 'MATCH' });
        useOverlayStore.setState({ displayMode: 'mini' });
      } else {
        useOverlayStore.getState().toggleDisplayMode();
      }
    });

    const handleFooticsAction = (e: Event) => {
      const customEvent = e as CustomEvent<{ action: string }>;
      if (customEvent.detail?.action === 'TOGGLE_DISPLAY_MODE') {
        useOverlayStore.getState().toggleDisplayMode();
      }
    };
    window.addEventListener('footics-action', handleFooticsAction);

    return () => {
      unsubOpen();
      unsubToggleMini();
      window.removeEventListener('footics-action', handleFooticsAction);
    };
  }, [handleOpenMessage, isVisible]);

  // 閉じたときのフォーカス復元 & 動画再生再開を処理する useEffect
  useEffect(() => {
    if (!isVisible) {
      // 動画の自動再開
      if (pausedVideoRef.current) {
        const { video, wasPlaying } = pausedVideoRef.current;
        resumeVideoIfWasPaused(video, wasPlaying);
        pausedVideoRef.current = null;
      }

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
        <div
          className={cn(
            'footics-overlay-root',
            displayMode === 'mini' &&
              'fixed bottom-4 right-4 w-[320px] z-[2147483646] pointer-events-auto',
          )}
        >
          {displayMode === 'mini' ? <MiniMemoPanel /> : <MemoOverlayBridge />}
        </div>
      )}
    </div>
  );
};
