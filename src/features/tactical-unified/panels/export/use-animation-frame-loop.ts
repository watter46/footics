import { useCallback, useEffect, useRef } from 'react';

export function useAnimationFrameLoop(
  isPlaying: boolean,
  totalDurationMs: number,
  onFrame: (timeMs: number) => void,
) {
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const currentTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    startTimeRef.current = null;

    const loop = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp - currentTimeRef.current;
      }

      const elapsed = timestamp - startTimeRef.current;
      currentTimeRef.current = elapsed % totalDurationMs;

      onFrame(currentTimeRef.current);
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, totalDurationMs, onFrame]);

  useEffect(() => {
    onFrame(currentTimeRef.current);
  }, [onFrame]);

  const seek = useCallback(
    (time: number) => {
      currentTimeRef.current = time;
      startTimeRef.current = null;
      onFrame(time);
    },
    [onFrame],
  );

  return { seek };
}
