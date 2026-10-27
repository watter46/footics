import type { StateCreator } from 'zustand';
import type { TacticalUnifiedState } from './tactical-unified-store';

export interface SlidePlaybackSlice {
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlayback: () => void;
  stopPlayback: () => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  isLooping: boolean;
  setLooping: (looping: boolean) => void;
  playbackSlideIndex: number;
  playbackTransitionIndex: number | null;
  setPlaybackIndices: (
    slideIndex: number,
    transitionIndex: number | null,
  ) => void;
}

export const createSlidePlaybackSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  SlidePlaybackSlice
> = (set) => ({
  isPlaying: false,
  setIsPlaying: (isPlaying) =>
    set((state) => ({
      isPlaying,
      playbackTransitionIndex: isPlaying ? state.playbackTransitionIndex : null,
    })),
  togglePlayback: () => set((s) => ({ isPlaying: !s.isPlaying })),
  stopPlayback: () =>
    set({
      isPlaying: false,
      playbackSlideIndex: 0,
      playbackTransitionIndex: null,
    }),
  playbackSpeed: 1.0,
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  isLooping: false,
  setLooping: (isLooping) => set({ isLooping }),
  playbackSlideIndex: 0,
  playbackTransitionIndex: null,
  setPlaybackIndices: (playbackSlideIndex, playbackTransitionIndex) =>
    set((state) => {
      if (
        state.playbackSlideIndex === playbackSlideIndex &&
        state.playbackTransitionIndex === playbackTransitionIndex
      ) {
        return state;
      }
      return { playbackSlideIndex, playbackTransitionIndex };
    }),
});
