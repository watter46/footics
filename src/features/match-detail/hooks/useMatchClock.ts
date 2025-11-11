import { useMemo } from 'react';
import { useTimerStore } from '@/features/timer/stores/timer-store';
import { calculateDisplayTime } from '@/lib/utils/timer';

export const useMatchClock = () => {
  const elapsedSeconds = useTimerStore(state => state.elapsedSeconds);
  const phase = useTimerStore(state => state.phase);
  const stoppageSeconds = useTimerStore(state => state.stoppageSeconds);

  const formattedTime = useMemo(() => {
    const { main } = calculateDisplayTime(
      elapsedSeconds,
      phase,
      stoppageSeconds
    );
    return main;
  }, [elapsedSeconds, phase, stoppageSeconds]);

  return { formattedTime };
};
