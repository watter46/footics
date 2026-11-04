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

import { buildExportMVPMatrix } from '@/features/tactical-unified/core/utils/canvas-pitch-transform-helper';
import { calculatePitchRect } from '@/lib/tactical/pitch-geometry';
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
import { renderPitch } from './renderers/pitch-renderer';
import { renderPlayers } from './renderers/player-renderer';
import {
  type AnyCanvasRenderingContext2D,
  type FrameRenderContext,
  getOpticalCenterX,
  project3DLineSegment,
  project3DPoint,
  TACTICAL_CANVAS_FONT_FAMILY,
} from './renderers/renderer-context';
import { renderTexts } from './renderers/text-renderer';
import { renderZones } from './renderers/zone-renderer';

export {
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

  // 補間済みフレームデータを先行取得（事前計算済みフレームがあれば流用し動的カメラMVP行列の解決に利用）
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

  // 境界線が有効な場合、描画キャンバスのサイズ (w, h) はクロップ後の解像度であるため、
  // ピッチ全体のベース解像度 (baseWidth, baseHeight) を逆算して等倍描画基準とする
  const baseWidth =
    isBoundaryActive && boundaryBox && boundaryBox.width > 0
      ? (w * 100) / boundaryBox.width
      : w;
  const baseHeight =
    isBoundaryActive && boundaryBox && boundaryBox.height > 0
      ? (h * 100) / boundaryBox.height
      : h;

  // ピッチマーキング用（0〜100スケール、ピッチ枠基準の2Dスクリーン座標変換）
  const pitchRect = calculatePitchRect(
    { width: baseWidth, height: baseHeight },
    aspectRatio,
  );
  const toScreenX = (normX: number) =>
    pitchRect.x + (normX / 100) * pitchRect.width;
  const toScreenY = (normY: number) =>
    pitchRect.y + (normY / 100) * pitchRect.height;
  const toScreenSizeX = (normSize: number) =>
    (normSize / 100) * pitchRect.width;
  const toScreenSizeY = (normSize: number) =>
    (normSize / 100) * pitchRect.height;

  // チルト投影: オブジェクト（選手・ボール・矢印）の位置計算用。
  // 0〜100スケールのピッチ正規化座標 → 画面座標（px）
  // mvpMatrixが明示指定されていない場合は、補間済み frame.pitchTransform または pitchTransformOverride から動的生成
  let m = mvpMatrix && mvpMatrix.length === 16 ? mvpMatrix : null;
  if (!m) {
    const effectiveTransform =
      options.pitchTransformOverride ?? frame.pitchTransform;
    if (
      effectiveTransform &&
      (effectiveTransform.tilt !== 0 ||
        (effectiveTransform.yaw !== undefined &&
          effectiveTransform.yaw !== 90) ||
        effectiveTransform.zoom !== 1 ||
        effectiveTransform.panX !== 0 ||
        effectiveTransform.panY !== 0)
    ) {
      m = new Float32Array(
        buildExportMVPMatrix(
          effectiveTransform,
          baseWidth,
          baseHeight,
          aspectRatio,
        ),
      );
    }
  }

  /**
   * 3D透視投影による生のスクリーン座標計算
   */
  const project3D = (
    norm100X: number,
    norm100Y: number,
  ): { x: number; y: number } => {
    if (!m) return { x: 0, y: 0 };
    return project3DPoint(m, norm100X, norm100Y, baseWidth, baseHeight);
  };

  /**
   * 3D線分をNear-plane (clipW >= 0.05) でクリップして画面座標ペアを返す
   * 両端点ともカメラ背後なら null
   */
  const project3DSegment = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): [{ x: number; y: number }, { x: number; y: number }] | null => {
    if (!m) {
      return [
        { x: toScreenX(x1), y: toScreenY(y1) },
        { x: toScreenX(x2), y: toScreenY(y2) },
      ];
    }
    return project3DLineSegment(m, x1, y1, x2, y2, baseWidth, baseHeight);
  };

  /**
   * オブジェクト専用の座標変換（0〜100スケールのピッチ正規化座標 → 画面座標 px）
   * mvpMatrixあり: 行列ベクトル積による透視投影
   * mvpMatrixなし: 2D素のスクリーン座標変換
   */
  const projectObjToScreen = (
    norm100X: number,
    norm100Y: number,
  ): { x: number; y: number } => {
    if (m) {
      return project3D(norm100X, norm100Y);
    }
    return { x: toScreenX(norm100X), y: toScreenY(norm100Y) };
  };

  // Pixel grid snapping helpers to eliminate subpixel antialias fuzziness
  const snap = (v: number) => v;

  // キャンバス境界外のはみ出しを防ぐ安全クリッピングおよび一括ビューポート変換を開始
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.rect === 'function') {
    ctx.rect(0, 0, w, h);
  }
  if (typeof ctx.clip === 'function') {
    ctx.clip();
  }

  // 境界線（BoundaryBox）が有効な場合、等倍切り抜き（クロップ）用の translate のみ適用（scale は行わない）
  if (isBoundaryActive && boundaryBox) {
    const cropX_px = (boundaryBox.x / 100) * baseWidth;
    const cropY_px = (boundaryBox.y / 100) * baseHeight;

    if (typeof ctx.translate === 'function') {
      ctx.translate(-cropX_px, -cropY_px);
    }
  }

  const frameContext: FrameRenderContext = {
    ctx,
    w: baseWidth,
    h: baseHeight,
    aspectRatio,
    m,
    toScreenX,
    toScreenY,
    toScreenSizeX,
    toScreenSizeY,
    projectObjToScreen,
    project3DSegment,
    snap,
  };

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
