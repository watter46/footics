export type TimerPhase =
  | 'not-started'
  | 'first-half'
  | 'halftime'
  | 'second-half'
  | 'extra-first'
  | 'extra-halftime'
  | 'extra-second'
  | 'penalty'
  | 'finished';

export interface TimerState {
  elapsedSeconds: number;
  isRunning: boolean;
  phase: TimerPhase;
  stoppageSeconds: number;
}
