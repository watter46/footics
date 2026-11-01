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
import {
  getInterpolatedUnifiedSlideFrame,
  type InterpolatedUnifiedFrame,
} from '@/lib/tactical/unified-interpolation';
import type {
  AspectRatio,
  BoundaryBox,
  PitchAppearanceConfig,
  PitchTransform,
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

  // ピッチマーキング用（0〜100スケール、2D素のスクリーン座標変換）
  const toScreenX = (normX: number) => (normX / 100) * w;
  const toScreenY = (normY: number) => (normY / 100) * h;
  const toScreenSizeX = (normSize: number) => (normSize / 100) * w;
  const toScreenSizeY = (normSize: number) => (normSize / 100) * h;

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
        buildExportMVPMatrix(effectiveTransform, w, h, aspectRatio),
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
    // 0〜100 -> 0〜1にスケール
    const normX = norm100X / 100;
    const normY = norm100Y / 100;

    // モデル空間 (-0.5..0.5, 0.5..-0.5, 0)
    const modelX = normX - 0.5;
    const modelY = 0.5 - normY;

    // gl-matrix は Column-major: m0=0, m4=1, m8=2, m12=3 列目
    // clip = M * v
    const clipX = modelX * m[0] + modelY * m[4] + /* 0*m[8] */ m[12];
    const clipY = modelX * m[1] + modelY * m[5] + /* 0*m[9] */ m[13];
    const clipW = modelX * m[3] + modelY * m[7] + /* 0*m[11] */ m[15];

    if (Math.abs(clipW) < 1e-6) {
      return { x: 0, y: 0 };
    }

    // NDC (-1..1) -> 画面座標
    const ndcX = clipX / clipW;
    const ndcY = clipY / clipW;
    return {
      x: (ndcX + 1) * 0.5 * w,
      y: (1 - ndcY) * 0.5 * h,
    };
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

  // 境界線（BoundaryBox）が有効な場合、一括ビューポート変換（Scale & Translate）を適用
  if (isBoundaryActive && boundaryBox) {
    const cropX_px = (boundaryBox.x / 100) * w;
    const cropY_px = (boundaryBox.y / 100) * h;
    const cropW_px = (boundaryBox.width / 100) * w;
    const cropH_px = (boundaryBox.height / 100) * h;

    const scaleX = cropW_px > 0 ? w / cropW_px : 1;
    const scaleY = cropH_px > 0 ? h / cropH_px : 1;

    if (typeof ctx.scale === 'function') {
      ctx.scale(scaleX, scaleY);
    }
    if (typeof ctx.translate === 'function') {
      ctx.translate(-cropX_px, -cropY_px);
    }
  }

  const frameContext: FrameRenderContext = {
    ctx,
    w,
    h,
    m,
    toScreenX,
    toScreenY,
    toScreenSizeX,
    toScreenSizeY,
    projectObjToScreen,
    snap,
  };

  // 1. Background & Pitch Markings
  renderPitch(
    frameContext,
    aspectRatio,
    transparent,
    pitchAppearance,
    marbleTexture,
  );

  // 2. Zones (Vertex Morphing)
  renderZones(frameContext, frame.zones);

  // 4. Connect Lines between players
  renderConnectLines(frameContext, frame.players);

  // 5. Arrows
  renderArrows(frameContext, frame.arrows);

  // 6. Players
  renderPlayers(frameContext, frame.players, playerPhotos);

  // 7. Soccer Ball
  renderBall(frameContext, frame.ball);

  // 8. Texts
  renderTexts(frameContext, frame.texts);

  // Restore clipping context
  ctx.restore();
}
