import { createStore, type StoreApi } from 'zustand';
import {
  type Milliseconds,
  toMilliseconds,
} from '@/lib/types/tactical/branded';

export interface PlaybackStoreState {
  readonly isPlaying: boolean;
  readonly timeMs: Milliseconds;
  readonly playbackSlideIndex: number;
  readonly playbackTransitionIndex: number | null;

  readonly startPlayback: () => void;
  readonly pausePlayback: () => void;
  readonly stopPlayback: () => void;
  readonly togglePlayback: () => void;
  readonly seekTo: (timeMs: number | Milliseconds) => void;
  readonly setTimeMs: (timeMs: number | Milliseconds) => void;
  readonly setPlaybackIndices: (
    slideIndex: number,
    transitionIndex: number | null,
  ) => void;
}

export type PlaybackStore = StoreApi<PlaybackStoreState>;

export function createPlaybackStore(
  initialTimeMs?: Milliseconds,
): PlaybackStore {
  return createStore<PlaybackStoreState>((set) => ({
    isPlaying: false,
    timeMs: initialTimeMs ?? toMilliseconds(0),
    playbackSlideIndex: 0,
    playbackTransitionIndex: null,

    startPlayback: () => set({ isPlaying: true }),

    pausePlayback: () => set({ isPlaying: false }),

    stopPlayback: () =>
      set({
        isPlaying: false,
        timeMs: toMilliseconds(0),
        playbackSlideIndex: 0,
        playbackTransitionIndex: null,
      }),

    togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

    seekTo: (timeMs: number | Milliseconds) =>
      set({
        timeMs: toMilliseconds(Math.max(0, Number(timeMs))),
      }),

    setTimeMs: (timeMs: number | Milliseconds) =>
      set({
        timeMs: toMilliseconds(Math.max(0, Number(timeMs))),
      }),

    setPlaybackIndices: (
      playbackSlideIndex: number,
      playbackTransitionIndex: number | null,
    ) => set({ playbackSlideIndex, playbackTransitionIndex }),
  }));
}
