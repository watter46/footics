import { useEffect } from 'react';
import { useTimerStore } from '@/features/timer/stores/timer-store';

export const useTimerTick = () => {
  const tick = useTimerStore(state => state.tick);
  const isRunning = useTimerStore(state => state.isRunning);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, tick]);
};
