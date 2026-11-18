'use client';

/** Tactical Unified Canvas — Animation Engine Hook (Stream Store Driver) */

import { useCallback, useEffect, useRef } from 'react';
import { selectDomainActivePhase } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  usePlaybackStore,
  useSessionStore,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { resolvePlaybackDurationMs } from '@/lib/tactical/engine/slide-timing';
import {
  type EvaluatedTimelineFrame,
  evaluateTimelineFrame,
} from '@/lib/tactical/engine/timeline-evaluator';
import { toMilliseconds } from '@/lib/types/tactical/branded';

export interface UseTacticalAnimationOptions {
  pitchSize?: { width: number; height: number };
  nodesRegistryRef?: { current?: unknown };
  loop?: boolean;
  onFrameEvaluated?: (frame: EvaluatedTimelineFrame) => void;
}

export function useTacticalAnimation(options?: UseTacticalAnimationOptions) {
  const { playbackStore } = useTacticalStoresContext();
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activePhase = useDocumentStore((s) =>
    selectDomainActivePhase(s.project, activePhaseId),
  );
  const workspaceMode = useSessionStore((s) => s.workspaceMode);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);

  const totalDurationMs = resolvePlaybackDurationMs(activePhase?.slides ?? []);

  const rafIdRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const onCompleteRef = useRef<(() => void) | undefined>(undefined);
  const loopRef = useRef(options?.loop ?? false);
  loopRef.current = options?.loop ?? false;
  const onFrameEvaluatedRef = useRef(options?.onFrameEvaluated);
  onFrameEvaluatedRef.current = options?.onFrameEvaluated;
  const activePhaseRef = useRef(activePhase);
  activePhaseRef.current = activePhase;

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
          if (activePhaseRef.current && onFrameEvaluatedRef.current) {
            const evaluated = evaluateTimelineFrame(
              activePhaseRef.current,
              toMilliseconds(nextTime),
            );
            onFrameEvaluatedRef.current(evaluated);
          }
          rafIdRef.current = requestAnimationFrame(loopStep);
        } else {
          playbackStore.getState().setTimeMs(toMilliseconds(total));
          if (activePhaseRef.current && onFrameEvaluatedRef.current) {
            const evaluated = evaluateTimelineFrame(
              activePhaseRef.current,
              toMilliseconds(total),
            );
            onFrameEvaluatedRef.current(evaluated);
          }
          playbackStore.getState().pausePlayback();
          stopAnimationLoop();
          onCompleteRef.current?.();
        }
      } else {
        playbackStore.getState().setTimeMs(toMilliseconds(nextTime));
        if (activePhaseRef.current && onFrameEvaluatedRef.current) {
          const evaluated = evaluateTimelineFrame(
            activePhaseRef.current,
            toMilliseconds(nextTime),
          );
          onFrameEvaluatedRef.current(evaluated);
        }
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
      if (workspaceMode !== 'director') {
        startAnimationLoop();
      }
    },
    [playbackStore, startAnimationLoop, workspaceMode],
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
      if (activePhaseRef.current && onFrameEvaluatedRef.current) {
        const evaluated = evaluateTimelineFrame(
          activePhaseRef.current,
          toMilliseconds(timeMs),
        );
        onFrameEvaluatedRef.current(evaluated);
      }
    },
    [playbackStore],
  );

  const applyFrameToCanvas = useCallback(
    (timeMs: number) => {
      seekTo(timeMs);
    },
    [seekTo],
  );

  // isPlaying が外部から切り替えられた場合の同期（director モード時は rAF ループを起動しない）
  useEffect(() => {
    if (workspaceMode === 'director') {
      stopAnimationLoop();
      return;
    }
    if (isPlaying && rafIdRef.current === null) {
      const currentTime = playbackStore.getState().timeMs;
      const total = totalDurationRef.current;
      if (total > 0 && currentTime >= total) {
        playbackStore.getState().setTimeMs(toMilliseconds(0));
      }
      startAnimationLoop();
    } else if (!isPlaying && rafIdRef.current !== null) {
      stopAnimationLoop();
    }
  }, [
    isPlaying,
    playbackStore,
    startAnimationLoop,
    stopAnimationLoop,
    workspaceMode,
  ]);

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
  };
}
