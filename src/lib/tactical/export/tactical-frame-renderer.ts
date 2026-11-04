/**
 * tactical-frame-renderer.ts
 * High-performance, 100% deterministic 2D canvas renderer for Tactical Unified animations.
 *
 * Used for:
 *   - Offline MP4 video encoding (WebCodecs & mp4-muxer / MediaRecorder)
 *   - Offline Transparent WebM overlay encoding (MediaRecorder / VP9)
 *   - Real-time Animation Preview Player (Export Modal)
 *   - Snapshot / GIF frame rendering
 */

import {
  getInterpolatedUnifiedSlideFrame,
  type InterpolatedUnifiedFrame,
} from '@/lib/tactical/unified-interpolation';
import type {
  AspectRatio,
  BoundaryBox,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical-unified';
import { renderArrows, renderConnectLines } from './renderers/arrow-renderer';
import {
  renderBall,
  SOCCER_BALL_PATCH_PATHS,
  SOCCER_BALL_SEAM_LINES,
} from './renderers/ball-renderer';
import {
  _resetSharedOffscreenCanvas,
  getOffscreenCanvas,
} from './renderers/offscreen-canvas-pool';
import { renderPitch } from './renderers/pitch-renderer';
import { renderPlayers } from './renderers/player-renderer';
import {
  type AnyCanvasRenderingContext2D,
  createFrameRenderContext,
  getOpticalCenterX,
  TACTICAL_CANVAS_FONT_FAMILY,
} from './renderers/renderer-context';
import { renderTexts } from './renderers/text-renderer';
import { renderZones } from './renderers/zone-renderer';

export {
  _resetSharedOffscreenCanvas,
  type AnyCanvasRenderingContext2D,
  getOpticalCenterX,
  SOCCER_BALL_PATCH_PATHS,
  SOCCER_BALL_SEAM_LINES,
  TACTICAL_CANVAS_FONT_FAMILY,
};

export type InterpolatedUnifiedSlideFrame = InterpolatedUnifiedFrame;

export interface RenderTacticalFrameOptions {
  slides: Slide[];
  timeMs: number;
  width: number;
  height: number;
  /** 16:9正規描画の基準幅 (例: 1920) */
  baseWidth?: number;
  /** 16:9正規描画の基準高 (例: 1080) */
  baseHeight?: number;
  aspectRatio: AspectRatio;
  boundaryBox?: BoundaryBox | null;
  transparent?: boolean;
  /** エクスポート用の透視投影MVP行列（Float32Array） */
  mvpMatrix?: Float32Array | null;
  /** スライドのカメラ設定を強制上書きするPitchTransform */
  pitchTransformOverride?: PitchTransform | null;
  /** 選手の顔写真ソースマップ (playerId または player.id -> CanvasImageSource) */
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  /** ピッチ外観カスタム設定 */
  pitchAppearance?: PitchAppearanceConfig;
  /** 大理石テクスチャ画像 */
  marbleTexture?: CanvasImageSource | null;
  /** 画面背景設定 (シネマティック放射グラデーション / 単色ダーク) */
  screenBackground?: ScreenBackgroundConfig;
  /** 事前計算済み補間フレーム（指定時は getInterpolatedUnifiedSlideFrame の再計算をスキップ） */
  precomputedFrame?: InterpolatedUnifiedSlideFrame;
}

export type RenderTacticalFrameParams = RenderTacticalFrameOptions;

/**
 * Returns true when `timeMs` falls within a `pauseMs` (static freeze) interval
 * between two slides, meaning the canvas content is identical to the previous frame.
 * Used by the VideoFrame.clone() static-frame cache to skip redundant GPU re-uploads.
 */
export function isPauseFrame(slides: Slide[], timeMs: number): boolean {
  if (slides.length <= 1) return false;
  const frame = getInterpolatedUnifiedSlideFrame(slides, timeMs);
  return frame.isPaused;
}

/**
 * Draws a complete tactical animation frame onto a 2D canvas context.
 */
export function renderTacticalFrameToCanvas(
  ctx: AnyCanvasRenderingContext2D,
  options: RenderTacticalFrameOptions,
): void {
  const {
    slides,
    timeMs,
    width: w,
    height: h,
    aspectRatio,
    boundaryBox,
    transparent = false,
    mvpMatrix,
    playerPhotos,
    pitchAppearance,
    marbleTexture,
    screenBackground,
  } = options;

  if (w <= 0 || h <= 0) return;

  // 補間済みフレームデータを先行取得
  const frame =
    options.precomputedFrame ??
    getInterpolatedUnifiedSlideFrame(slides, timeMs);

  const isBoundaryActive =
    boundaryBox?.enabled &&
    boundaryBox.width > 0 &&
    boundaryBox.height > 0 &&
    (boundaryBox.width < 100 ||
      boundaryBox.height < 100 ||
      boundaryBox.x > 0 ||
      boundaryBox.y > 0);

  if (isBoundaryActive && boundaryBox) {
    const canonicalW =
      options.baseWidth ??
      Math.round((w * 100) / Math.max(1, boundaryBox.width));
    const canonicalH =
      options.baseHeight ??
      Math.round((h * 100) / Math.max(1, boundaryBox.height));

    const cropX = (boundaryBox.x / 100) * canonicalW;
    const cropY = (boundaryBox.y / 100) * canonicalH;
    const cropW = (boundaryBox.width / 100) * canonicalW;
    const cropH = (boundaryBox.height / 100) * canonicalH;

    const offscreen = getOffscreenCanvas(canonicalW, canonicalH);
    if (offscreen && typeof ctx.drawImage === 'function') {
      if (typeof offscreen.ctx.clearRect === 'function') {
        offscreen.ctx.clearRect(0, 0, canonicalW, canonicalH);
      }
      // 1. オフスクリーンへ 16:9 全体フレームを正規描画
      renderTacticalFrameToCanvas(offscreen.ctx, {
        ...options,
        width: canonicalW,
        height: canonicalH,
        baseWidth: canonicalW,
        baseHeight: canonicalH,
        boundaryBox: null,
      });

      // 2. メイン出力先へ指定領域を切り抜き転送
      ctx.drawImage(
        offscreen.canvas as CanvasImageSource,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        w,
        h,
      );
      return;
    }
  }

  // 境界線が有効かつオフスクリーン context が取得できない場合のフォールバック基準解像度
  const canonicalW =
    isBoundaryActive && boundaryBox
      ? (options.baseWidth ??
        Math.round((w * 100) / Math.max(1, boundaryBox.width)))
      : (options.baseWidth ?? w);
  const canonicalH =
    isBoundaryActive && boundaryBox
      ? (options.baseHeight ??
        Math.round((h * 100) / Math.max(1, boundaryBox.height)))
      : (options.baseHeight ?? h);

  const baseWidth = isBoundaryActive ? canonicalW : w;
  const baseHeight = isBoundaryActive ? canonicalH : h;

  // キャンバス境界外のはみ出しを防ぐ安全クリッピングおよび一括ビューポート変換を開始
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.rect === 'function') {
    ctx.rect(0, 0, w, h);
  }
  if (typeof ctx.clip === 'function') {
    ctx.clip();
  }

  // 境界線（BoundaryBox）が有効な場合のフォールバック等倍切り抜き（translate のみ適用）
  if (isBoundaryActive && boundaryBox) {
    const cropX = (boundaryBox.x / 100) * canonicalW;
    const cropY = (boundaryBox.y / 100) * canonicalH;

    if (typeof ctx.translate === 'function') {
      ctx.translate(-cropX, -cropY);
    }
  }

  const frameContext = createFrameRenderContext({
    ctx,
    baseWidth,
    baseHeight,
    aspectRatio,
    mvpMatrix,
    pitchTransformOverride: options.pitchTransformOverride,
    framePitchTransform: frame.pitchTransform,
  });

  // 1. Background & Pitch Markings
  renderPitch(
    frameContext,
    aspectRatio,
    transparent,
    pitchAppearance,
    marbleTexture,
    screenBackground,
  );

  // 2. Zones (Vertex Morphing)
  renderZones(frameContext, frame.zones);

  // 4. Connect Lines between players
  renderConnectLines(frameContext, frame.players);

  // 5. Arrows
  renderArrows(frameContext, frame.arrows, frame.players);

  // 6. Players
  renderPlayers(frameContext, frame.players, playerPhotos);

  // 7. Soccer Ball
  renderBall(frameContext, frame.ball);

  // 8. Texts
  renderTexts(frameContext, frame.texts);

  // Restore clipping context
  ctx.restore();
}
