import { create } from 'zustand';

export type TimerPhase =
  | 'first-half'
  | 'second-half'
  | 'extra-first'
  | 'extra-second'
  | 'penalty';

interface TimerState {
  elapsedSeconds: number;
  phase: TimerPhase;
  isRunning: boolean;
  stoppageSeconds: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  switchToPhase: (phase: TimerPhase) => void;
  addStoppage: (minutes: number) => void;
  adjustTime: (seconds: number) => void;
  setElapsedSeconds: (seconds: number) => void;
}

const HALF_DURATION = 45 * 60;
const EXTRA_HALF_DURATION = 15 * 60;

const getPhaseStartTime = (phase: TimerPhase): number => {
  switch (phase) {
    case 'first-half':
      return 0;
    case 'second-half':
      return HALF_DURATION;
    case 'extra-first':
      return HALF_DURATION * 2;
    case 'extra-second':
      return HALF_DURATION * 2 + EXTRA_HALF_DURATION;
    case 'penalty':
      return HALF_DURATION * 2 + EXTRA_HALF_DURATION * 2;
    default:
      return 0;
  }
};

export const useTimerStore = create<TimerState>((set, get) => ({
  elapsedSeconds: 0,
  phase: 'first-half',
  isRunning: false,
  stoppageSeconds: 0,

  start() {
    set({ isRunning: true });
  },

  pause() {
    set({ isRunning: false });
  },

  reset() {
    const { phase } = get();
    const startTime = getPhaseStartTime(phase);
    set({
      elapsedSeconds: startTime,
      isRunning: false,
      stoppageSeconds: 0,
    });
  },

  tick() {
    const { isRunning } = get();
    if (!isRunning) {
      return;
    }

    set(state => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
  },

  switchToPhase(newPhase) {
    const startTime = getPhaseStartTime(newPhase);
    set({
      phase: newPhase,
      elapsedSeconds: startTime,
      stoppageSeconds: 0,
      isRunning: false,
    });
  },

  addStoppage(minutes) {
    const { stoppageSeconds } = get();
    set({ stoppageSeconds: stoppageSeconds + minutes * 60 });
  },

  adjustTime(seconds) {
    const { elapsedSeconds, phase } = get();
    const minTime = getPhaseStartTime(phase);
    const newTime = elapsedSeconds + seconds;
    set({ elapsedSeconds: Math.max(minTime, newTime) });
  },

  setElapsedSeconds(seconds) {
    const { phase } = get();
    const minTime = getPhaseStartTime(phase);
    set({ elapsedSeconds: Math.max(minTime, seconds) });
  },
}));
