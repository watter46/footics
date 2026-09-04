import type { StateCreator } from 'zustand';
import {
  createSlideAttachmentSlice,
  type SlideAttachmentSlice,
} from './slide-attachment-slice';
import { createSlideBallSlice, type SlideBallSlice } from './slide-ball-slice';
import { createSlideCrudSlice, type SlideCrudSlice } from './slide-crud-slice';
import {
  createSlideFormationSlice,
  type SlideFormationSlice,
} from './slide-formation-slice';
import {
  createSlidePlaybackSlice,
  type SlidePlaybackSlice,
} from './slide-playback-slice';
import {
  createSlidePlayerSlice,
  type SlidePlayerSlice,
} from './slide-player-slice';
import {
  createSlideTransitionSlice,
  type SlideTransitionSlice,
} from './slide-transition-slice';
import type { TacticalUnifiedState } from './tactical-unified-store';

/**
 * SlideSlice: スライド・選手・アニメーション・フォーメーションを統括する合成インターフェース
 */
export interface SlideSlice
  extends SlideCrudSlice,
    SlideTransitionSlice,
    SlidePlaybackSlice,
    SlidePlayerSlice,
    SlideFormationSlice,
    SlideAttachmentSlice,
    SlideBallSlice {}

/**
 * createSlideSlice: 関心事ごとに分割された各サブスライスを合成して提供
 */
export const createSlideSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  SlideSlice
> = (...a) => ({
  ...createSlideCrudSlice(...a),
  ...createSlideTransitionSlice(...a),
  ...createSlidePlaybackSlice(...a),
  ...createSlidePlayerSlice(...a),
  ...createSlideFormationSlice(...a),
  ...createSlideAttachmentSlice(...a),
  ...createSlideBallSlice(...a),
});

export * from './slide-attachment-slice';
export * from './slide-ball-slice';
export * from './slide-crud-slice';
export * from './slide-formation-helpers';
export * from './slide-formation-slice';
export * from './slide-helpers';
export * from './slide-playback-slice';
export * from './slide-player-helpers';
export * from './slide-player-slice';
export * from './slide-transition-slice';
