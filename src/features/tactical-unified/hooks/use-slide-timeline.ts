import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface SlideTimelineOptions {
  durationMs: number;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
  autoPlay?: boolean;
}

export interface SlideTimelineControls {
  play: () => void;
  pause: () => void;
  seek: (progress: number) => void;
  kill: () => void;
  progress: number;
  isPlaying: boolean;
}

/**
 * GSAP Timeline を活用したスライドアニメーション・フレーム補間制御フック
 *
 * 再生、一時停止、シーク、完了通知およびコンポーネントアンマウント時の確実な破棄を提供します。
 */
export function useSlideTimeline({
  durationMs,
  onUpdate,
  onComplete,
  autoPlay = false,
}: SlideTimelineOptions): SlideTimelineControls {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const progressProxyRef = useRef({ progress: 0 });

  useEffect(() => {
    const durationSec = Math.max(0.001, durationMs / 1000);
    const proxy = progressProxyRef.current;
    proxy.progress = 0;

    const tl = gsap.timeline({
      paused: !autoPlay,
      onUpdate: () => {
        const currentProgress = proxy.progress;
        setProgress(currentProgress);
        onUpdate?.(currentProgress);
      },
      onComplete: () => {
        setIsPlaying(false);
        setProgress(1);
        onComplete?.();
      },
    });

    tl.to(proxy, {
      progress: 1,
      duration: durationSec,
      ease: 'none',
    });

    timelineRef.current = tl;

    return () => {
      tl.kill();
      timelineRef.current = null;
    };
  }, [durationMs, autoPlay, onUpdate, onComplete]);

  const play = useCallback(() => {
    if (!timelineRef.current) return;
    if (timelineRef.current.progress() >= 1) {
      timelineRef.current.restart();
    } else {
      timelineRef.current.play();
    }
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    if (!timelineRef.current) return;
    timelineRef.current.pause();
    setIsPlaying(false);
  }, []);

  const seek = useCallback(
    (targetProgress: number) => {
      if (!timelineRef.current) return;
      const clamped = Math.max(0, Math.min(1, targetProgress));
      timelineRef.current.progress(clamped);
      progressProxyRef.current.progress = clamped;
      setProgress(clamped);
      onUpdate?.(clamped);
    },
    [onUpdate],
  );

  const kill = useCallback(() => {
    if (!timelineRef.current) return;
    timelineRef.current.kill();
    timelineRef.current = null;
    setIsPlaying(false);
  }, []);

  return {
    play,
    pause,
    seek,
    kill,
    progress,
    isPlaying,
  };
}
