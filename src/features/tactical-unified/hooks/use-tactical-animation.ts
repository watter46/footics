'use client';

/** Tactical Unified Canvas — Animation Engine Hook (Stream Store Driver) */

import { useCallback, useEffect, useRef } from 'react';
import {
  useDocumentStore,
  usePlaybackStore,
  useSessionStore,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { toMilliseconds } from '@/lib/types/tactical/branded';
import type { DomainTacticalPhase } from '@/lib/types/tactical/domain-hierarchy';

export interface UseTacticalAnimationOptions {
  pitchSize?: { width: number; height: number };
  nodesRegistryRef?: { current?: unknown };
  loop?: boolean;
}

export function calculatePhaseTotalDuration(
  phase?: DomainTacticalPhase,
): number {
  if (!phase || !phase.slides || phase.slides.length === 0) return 0;
  if (phase.slides.length === 1) {
    const s = phase.slides[0];
    const dur = s.transitionDurationMs ?? 1000;
    const pause = s.pauseMs ?? 500;
    return Math.max(1000, dur + pause);
  }
  return phase.slides.slice(0, -1).reduce((sum, s) => {
    const dur = s.transitionDurationMs ?? 1000;
    const pause = s.pauseMs ?? 500;
    return sum + dur + pause;
  }, 0);
}

export function useTacticalAnimation(options?: UseTacticalAnimationOptions) {
  const { playbackStore } = useTacticalStoresContext();
  const project = useDocumentStore((s) => s.project);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const currentPlaybackTime = usePlaybackStore((s) => s.timeMs);

  const activePhase =
    project.phases.find((p) => p.id === activePhaseId) ?? project.phases[0];

  const totalDurationMs = calculatePhaseTotalDuration(activePhase);

  const rafIdRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const onCompleteRef = useRef<(() => void) | undefined>(undefined);
  const loopRef = useRef(options?.loop ?? false);
  loopRef.current = options?.loop ?? false;

  const totalDurationRef = useRef(totalDurationMs);
  totalDurationRef.current = totalDurationMs;

  const stopAnimationLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    lastTimestampRef.current = null;
  }, []);

  const startAnimationLoop = useCallback(() => {
    stopAnimationLoop();

    const loopStep = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const delta = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      const currentTime = playbackStore.getState().timeMs;
      const total = totalDurationRef.current;
      let nextTime = currentTime + delta;

      if (total > 0 && nextTime >= total) {
        if (loopRef.current) {
          nextTime = nextTime % total;
          playbackStore.getState().setTimeMs(toMilliseconds(nextTime));
          rafIdRef.current = requestAnimationFrame(loopStep);
        } else {
          playbackStore.getState().setTimeMs(toMilliseconds(total));
          playbackStore.getState().pausePlayback();
          stopAnimationLoop();
          onCompleteRef.current?.();
        }
      } else {
        playbackStore.getState().setTimeMs(toMilliseconds(nextTime));
        rafIdRef.current = requestAnimationFrame(loopStep);
      }
    };

    rafIdRef.current = requestAnimationFrame(loopStep);
  }, [playbackStore, stopAnimationLoop]);

  const playAnimation = useCallback(
    (onComplete?: () => void) => {
      onCompleteRef.current = onComplete;
      const currentTime = playbackStore.getState().timeMs;
      const total = totalDurationRef.current;
      if (total > 0 && currentTime >= total) {
        playbackStore.getState().setTimeMs(toMilliseconds(0));
      }
      playbackStore.getState().startPlayback();
      startAnimationLoop();
    },
    [playbackStore, startAnimationLoop],
  );

  const pauseAnimation = useCallback(() => {
    stopAnimationLoop();
    playbackStore.getState().pausePlayback();
  }, [playbackStore, stopAnimationLoop]);

  const stopAnimation = useCallback(() => {
    stopAnimationLoop();
    playbackStore.getState().stopPlayback();
  }, [playbackStore, stopAnimationLoop]);

  const seekTo = useCallback(
    (timeMs: number) => {
      playbackStore.getState().seekTo(toMilliseconds(timeMs));
    },
    [playbackStore],
  );

  const applyFrameToCanvas = useCallback(
    (timeMs: number) => {
      seekTo(timeMs);
    },
    [seekTo],
  );

  // isPlaying が外部から切り替えられた場合の同期
  useEffect(() => {
    if (isPlaying && rafIdRef.current === null) {
      startAnimationLoop();
    } else if (!isPlaying && rafIdRef.current !== null) {
      stopAnimationLoop();
    }
  }, [isPlaying, startAnimationLoop, stopAnimationLoop]);

  // RAII: アンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      stopAnimationLoop();
    };
  }, [stopAnimationLoop]);

  return {
    playAnimation,
    pauseAnimation,
    stopAnimation,
    seekTo,
    applyFrameToCanvas,
    totalDurationMs,
    currentPlaybackTime,
  };
}
