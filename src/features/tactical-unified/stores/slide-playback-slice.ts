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
}

export const createSlidePlaybackSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  SlidePlaybackSlice
> = (set) => ({
  isPlaying: false,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlayback: () => set((s) => ({ isPlaying: !s.isPlaying })),
  stopPlayback: () => set({ isPlaying: false }),
  playbackSpeed: 1.0,
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  isLooping: false,
  setLooping: (isLooping) => set({ isLooping }),
});
