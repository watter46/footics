import { createShapeId } from 'tldraw';

/** 背景画像の Shape ID */
export const BG_SCREENSHOT_ID = createShapeId('bg-screenshot');

/** キャプチャ範囲（描画範囲切り出し枠）の Shape ID */
export const CAPTURE_FRAME_ID = createShapeId('capture_frame');

/** 最大最適化幅（画像のコピー・保存時のスケール計算用） */
export const MAX_OPTIMIZED_WIDTH = 1600;

/** マーカーに従属するオプションShapeのtypeリスト */
export const MARKER_OPTION_TYPES = [
  'marker_arrow_solid',
  'marker_arrow_dash',
  'marker_man_mark',
  'marker_fov',
] as const;

export type MarkerOptionType = (typeof MARKER_OPTION_TYPES)[number];
