import type { StateCreator } from 'zustand';
import {
  createSlidePlayerCrudSlice,
  type SlidePlayerCrudSlice,
} from './slide-player-crud-slice';
import {
  createSlidePlayerMoveSlice,
  type SlidePlayerMoveSlice,
} from './slide-player-move-slice';
import type { TacticalUnifiedState } from './tactical-unified-store';

export interface SlidePlayerSlice
  extends SlidePlayerCrudSlice,
    SlidePlayerMoveSlice {}

export const createSlidePlayerSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  SlidePlayerSlice
> = (...a) => ({
  ...createSlidePlayerCrudSlice(...a),
  ...createSlidePlayerMoveSlice(...a),
});

export * from './slide-player-crud-slice';
export * from './slide-player-move-slice';
