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
  MARKER_PATHS,
  MARKER_VIEWBOX_SIZE,
  SPOTLIGHT_BEAM_BOTTOM_CENTER_X,
  SPOTLIGHT_BEAM_BOTTOM_MAX_Y,
  SPOTLIGHT_BEAM_BOTTOM_WIDTH,
  SPOTLIGHT_BEAM_PATH,
} from '@/lib/tactical/marker-assets';
import { calculatePitchGeometryForAspect } from '@/lib/tactical/pitch-geometry';
import { getLastName } from '@/lib/tactical/player-formatting';
import { getInterpolatedUnifiedSlideFrame } from '@/lib/tactical/unified-interpolation';
import type {
  AspectRatio,
  BoundaryBox,
  Slide,
} from '@/lib/types/tactical-unified';

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

export type AnyCanvasRenderingContext2D =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

/**
 * Draws pitch lines and markings for the given aspect ratio in 2D or 3D projected space.
 */
function drawPitchMarkings(
  ctx: AnyCanvasRenderingContext2D,
  aspectRatio: AspectRatio,
  w: number,
  m: Float32Array | null | undefined,
  toScreenX: (normX: number) => number,
  toScreenY: (normY: number) => number,
  toScreenSizeX: (normSize: number) => number,
  toScreenSizeY: (normSize: number) => number,
  projectObjToScreen: (
    norm100X: number,
    norm100Y: number,
  ) => { x: number; y: number },
  snap: (v: number) => number,
): void {
  const geom = calculatePitchGeometryForAspect(aspectRatio);
  const {
    pitchLeft,
    pitchTop,
    pitchWidth,
    pitchHeight,
    centerX,
    centerY,
    meterScale,
    centerCircleRadius,
    paDepth,
    paWidth,
    gaDepth,
    gaWidth,
    penaltySpotDist,
    cornerArcRadius,
    config,
  } = geom;

  const isHorizontal = config.orientation === 'horizontal';
  const left = pitchLeft;
  const right = pitchLeft + pitchWidth;
  const top = pitchTop;
  const bottom = pitchTop + pitchHeight;
  const r = centerCircleRadius;
  const arcAngle = Math.acos(
    Math.min(1, Math.max(-1, (paDepth - penaltySpotDist) / r)),
  );

  const toNormX = (svgX: number) => (svgX / config.widthPx) * 100;
  const toNormY = (svgY: number) => (svgY / config.heightPx) * 100;
  const toNormW = (svgW: number) => (svgW / config.widthPx) * 100;
  const toNormH = (svgH: number) => (svgH / config.heightPx) * 100;

  ctx.save();
  ctx.strokeStyle = '#e2b48d';
  ctx.fillStyle = 'none';
  const pitchLineWidth = Math.max(2, Math.round((w * 0.003) / 2) * 2);
  ctx.lineWidth = pitchLineWidth;
  ctx.globalAlpha = 0.85;

  if (m) {
    const projectPitch = (vx: number, vy: number) =>
      projectObjToScreen(toNormX(vx), toNormY(vy));

    const draw3DLine = (x1: number, y1: number, x2: number, y2: number) => {
      const p1 = projectPitch(x1, y1);
      const p2 = projectPitch(x2, y2);
      ctx.beginPath();
      ctx.moveTo(snap(p1.x), snap(p1.y));
      ctx.lineTo(snap(p2.x), snap(p2.y));
      ctx.stroke();
    };

    const draw3DQuad = (
      qx: number,
      qy: number,
      qw: number,
      qh: number,
      fill = false,
      stroke = true,
    ) => {
      const p1 = projectPitch(qx, qy);
      const p2 = projectPitch(qx + qw, qy);
      const p3 = projectPitch(qx + qw, qy + qh);
      const p4 = projectPitch(qx, qy + qh);
      ctx.beginPath();
      ctx.moveTo(snap(p1.x), snap(p1.y));
      ctx.lineTo(snap(p2.x), snap(p2.y));
      ctx.lineTo(snap(p3.x), snap(p3.y));
      ctx.lineTo(snap(p4.x), snap(p4.y));
      ctx.closePath();
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
    };

    const draw3DArc = (
      cx: number,
      cy: number,
      radius: number,
      startAngle = 0,
      endAngle = Math.PI * 2,
      segments = 36,
    ) => {
      ctx.beginPath();
      const angleSpan = endAngle - startAngle;
      for (let i = 0; i <= segments; i++) {
        const angle = startAngle + (angleSpan * i) / segments;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        const pt = projectPitch(px, py);
        if (i === 0) {
          ctx.moveTo(snap(pt.x), snap(pt.y));
        } else {
          ctx.lineTo(snap(pt.x), snap(pt.y));
        }
      }
      ctx.stroke();
    };

    const draw3DSpot = (cx: number, cy: number, radius: number) => {
      ctx.save();
      ctx.fillStyle = '#e2b48d';
      ctx.beginPath();
      const segments = 16;
      for (let i = 0; i <= segments; i++) {
        const angle = (Math.PI * 2 * i) / segments;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        const pt = projectPitch(px, py);
        if (i === 0) {
          ctx.moveTo(snap(pt.x), snap(pt.y));
        } else {
          ctx.lineTo(snap(pt.x), snap(pt.y));
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    // Outer Pitch Lines (Touchlines & Goal lines)
    draw3DQuad(left, top, pitchWidth, pitchHeight);

    if (isHorizontal) {
      draw3DLine(centerX, top, centerX, bottom);
      draw3DArc(centerX, centerY, r, 0, Math.PI * 2, 48);
      draw3DSpot(centerX, centerY, Math.max(2, 0.4 * meterScale));
      draw3DQuad(left, centerY - paWidth / 2, paDepth, paWidth);
      draw3DQuad(right - paDepth, centerY - paWidth / 2, paDepth, paWidth);
      draw3DQuad(left, centerY - gaWidth / 2, gaDepth, gaWidth);
      draw3DQuad(right - gaDepth, centerY - gaWidth / 2, gaDepth, gaWidth);
      draw3DSpot(
        left + penaltySpotDist,
        centerY,
        Math.max(2, 0.3 * meterScale),
      );
      draw3DSpot(
        right - penaltySpotDist,
        centerY,
        Math.max(2, 0.3 * meterScale),
      );
      draw3DArc(left + penaltySpotDist, centerY, r, -arcAngle, arcAngle, 24);
      draw3DArc(
        right - penaltySpotDist,
        centerY,
        r,
        Math.PI - arcAngle,
        Math.PI + arcAngle,
        24,
      );
      draw3DArc(left, top, cornerArcRadius, 0, Math.PI / 2, 12);
      draw3DArc(right, top, cornerArcRadius, Math.PI / 2, Math.PI, 12);
      draw3DArc(left, bottom, cornerArcRadius, -Math.PI / 2, 0, 12);
      draw3DArc(right, bottom, cornerArcRadius, Math.PI, Math.PI * 1.5, 12);
    } else {
      draw3DLine(left, centerY, right, centerY);
      draw3DArc(centerX, centerY, r, 0, Math.PI * 2, 48);
      draw3DSpot(centerX, centerY, Math.max(2, 0.4 * meterScale));
      draw3DQuad(centerX - paWidth / 2, top, paWidth, paDepth);
      draw3DQuad(centerX - paWidth / 2, bottom - paDepth, paWidth, paDepth);
      draw3DQuad(centerX - gaWidth / 2, top, gaWidth, gaDepth);
      draw3DQuad(centerX - gaWidth / 2, bottom - gaDepth, gaWidth, gaDepth);
      draw3DSpot(centerX, top + penaltySpotDist, Math.max(2, 0.3 * meterScale));
      draw3DSpot(
        centerX,
        bottom - penaltySpotDist,
        Math.max(2, 0.3 * meterScale),
      );
      draw3DArc(
        centerX,
        top + penaltySpotDist,
        r,
        Math.PI / 2 - arcAngle,
        Math.PI / 2 + arcAngle,
        24,
      );
      draw3DArc(
        centerX,
        bottom - penaltySpotDist,
        r,
        -Math.PI / 2 - arcAngle,
        -Math.PI / 2 + arcAngle,
        24,
      );
      draw3DArc(left, top, cornerArcRadius, 0, Math.PI / 2, 12);
      draw3DArc(right, top, cornerArcRadius, Math.PI / 2, Math.PI, 12);
      draw3DArc(left, bottom, cornerArcRadius, -Math.PI / 2, 0, 12);
      draw3DArc(right, bottom, cornerArcRadius, Math.PI, Math.PI * 1.5, 12);
    }
  } else {
    // 2D Flat Markings
    ctx.strokeRect(
      snap(toScreenX(toNormX(left))),
      snap(toScreenY(toNormY(top))),
      snap(toScreenSizeX(toNormW(pitchWidth))),
      snap(toScreenSizeY(toNormH(pitchHeight))),
    );

    if (isHorizontal) {
      ctx.beginPath();
      ctx.moveTo(
        snap(toScreenX(toNormX(centerX))),
        snap(toScreenY(toNormY(top))),
      );
      ctx.lineTo(
        snap(toScreenX(toNormX(centerX))),
        snap(toScreenY(toNormY(bottom))),
      );
      ctx.stroke();

      const cx = toScreenX(toNormX(centerX));
      const cy = toScreenY(toNormY(centerY));
      const rX = toScreenSizeX(toNormW(r));
      const rY = toScreenSizeY(toNormH(r));
      ctx.beginPath();
      ctx.ellipse(snap(cx), snap(cy), snap(rX), snap(rY), 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        snap(cx),
        snap(cy),
        Math.max(2, Math.round(w * 0.003)),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#e2b48d';
      ctx.fill();
      ctx.fillStyle = 'none';

      ctx.strokeRect(
        snap(toScreenX(toNormX(left))),
        snap(toScreenY(toNormY(centerY - paWidth / 2))),
        snap(toScreenSizeX(toNormW(paDepth))),
        snap(toScreenSizeY(toNormH(paWidth))),
      );
      ctx.strokeRect(
        snap(toScreenX(toNormX(right - paDepth))),
        snap(toScreenY(toNormY(centerY - paWidth / 2))),
        snap(toScreenSizeX(toNormW(paDepth))),
        snap(toScreenSizeY(toNormH(paWidth))),
      );
      ctx.strokeRect(
        snap(toScreenX(toNormX(left))),
        snap(toScreenY(toNormY(centerY - gaWidth / 2))),
        snap(toScreenSizeX(toNormW(gaDepth))),
        snap(toScreenSizeY(toNormH(gaWidth))),
      );
      ctx.strokeRect(
        snap(toScreenX(toNormX(right - gaDepth))),
        snap(toScreenY(toNormY(centerY - gaWidth / 2))),
        snap(toScreenSizeX(toNormW(gaDepth))),
        snap(toScreenSizeY(toNormH(gaWidth))),
      );
      ctx.beginPath();
      ctx.arc(
        snap(toScreenX(toNormX(left + penaltySpotDist))),
        snap(toScreenY(toNormY(centerY))),
        Math.max(2, Math.round(w * 0.003)),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#e2b48d';
      ctx.fill();
      ctx.fillStyle = 'none';

      ctx.beginPath();
      ctx.ellipse(
        snap(toScreenX(toNormX(left + penaltySpotDist))),
        snap(toScreenY(toNormY(centerY))),
        snap(rX),
        snap(rY),
        0,
        -arcAngle,
        arcAngle,
      );
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        snap(toScreenX(toNormX(right - penaltySpotDist))),
        snap(toScreenY(toNormY(centerY))),
        Math.max(2, Math.round(w * 0.003)),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#e2b48d';
      ctx.fill();
      ctx.fillStyle = 'none';

      ctx.beginPath();
      ctx.ellipse(
        snap(toScreenX(toNormX(right - penaltySpotDist))),
        snap(toScreenY(toNormY(centerY))),
        snap(rX),
        snap(rY),
        0,
        Math.PI - arcAngle,
        Math.PI + arcAngle,
      );
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(
        snap(toScreenX(toNormX(left))),
        snap(toScreenY(toNormY(centerY))),
      );
      ctx.lineTo(
        snap(toScreenX(toNormX(right))),
        snap(toScreenY(toNormY(centerY))),
      );
      ctx.stroke();

      const cx = toScreenX(toNormX(centerX));
      const cy = toScreenY(toNormY(centerY));
      const rX = toScreenSizeX(toNormW(r));
      const rY = toScreenSizeY(toNormH(r));
      ctx.beginPath();
      ctx.ellipse(snap(cx), snap(cy), snap(rX), snap(rY), 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        snap(cx),
        snap(cy),
        Math.max(2, Math.round(w * 0.005)),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#e2b48d';
      ctx.fill();
      ctx.fillStyle = 'none';

      ctx.strokeRect(
        snap(toScreenX(toNormX(centerX - paWidth / 2))),
        snap(toScreenY(toNormY(top))),
        snap(toScreenSizeX(toNormW(paWidth))),
        snap(toScreenSizeY(toNormH(paDepth))),
      );
      ctx.strokeRect(
        snap(toScreenX(toNormX(centerX - paWidth / 2))),
        snap(toScreenY(toNormY(bottom - paDepth))),
        snap(toScreenSizeX(toNormW(paWidth))),
        snap(toScreenSizeY(toNormH(paDepth))),
      );
      ctx.strokeRect(
        snap(toScreenX(toNormX(centerX - gaWidth / 2))),
        snap(toScreenY(toNormY(top))),
        snap(toScreenSizeX(toNormW(gaWidth))),
        snap(toScreenSizeY(toNormH(gaDepth))),
      );
      ctx.strokeRect(
        snap(toScreenX(toNormX(centerX - gaWidth / 2))),
        snap(toScreenY(toNormY(bottom - gaDepth))),
        snap(toScreenSizeX(toNormW(gaWidth))),
        snap(toScreenSizeY(toNormH(gaDepth))),
      );
      ctx.beginPath();
      ctx.arc(
        snap(toScreenX(toNormX(centerX))),
        snap(toScreenY(toNormY(top + penaltySpotDist))),
        Math.max(2, Math.round(w * 0.004)),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#e2b48d';
      ctx.fill();
      ctx.fillStyle = 'none';

      ctx.beginPath();
      ctx.ellipse(
        snap(toScreenX(toNormX(centerX))),
        snap(toScreenY(toNormY(top + penaltySpotDist))),
        snap(rX),
        snap(rY),
        0,
        Math.PI / 2 - arcAngle,
        Math.PI / 2 + arcAngle,
      );
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        snap(toScreenX(toNormX(centerX))),
        snap(toScreenY(toNormY(bottom - penaltySpotDist))),
        Math.max(2, Math.round(w * 0.004)),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#e2b48d';
      ctx.fill();
      ctx.fillStyle = 'none';

      ctx.beginPath();
      ctx.ellipse(
        snap(toScreenX(toNormX(centerX))),
        snap(toScreenY(toNormY(bottom - penaltySpotDist))),
        snap(rX),
        snap(rY),
        0,
        -Math.PI / 2 - arcAngle,
        -Math.PI / 2 + arcAngle,
      );
      ctx.stroke();
    }
  }
  ctx.restore();
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
  } = options;

  if (w <= 0 || h <= 0) return;

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
  // mvpMatrixが指定されている場合（チルト非ゼロ時）、行列ベクトル積で透視投影を計算する
  const m = mvpMatrix;

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
  const snap = (v: number) => Math.round(v);

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

  // 1. Background & Pitch Markings
  if (transparent) {
    ctx.clearRect(0, 0, w, h);
  } else {
    // Solid pitch background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);
  }

  if (!transparent) {
    // Pitch surface fill
    if (m) {
      const p0 = projectObjToScreen(0, 0);
      const p1 = projectObjToScreen(100, 0);
      const p2 = projectObjToScreen(100, 100);
      const p3 = projectObjToScreen(0, 100);
      ctx.beginPath();
      ctx.moveTo(snap(p0.x), snap(p0.y));
      ctx.lineTo(snap(p1.x), snap(p1.y));
      ctx.lineTo(snap(p2.x), snap(p2.y));
      ctx.lineTo(snap(p3.x), snap(p3.y));
      ctx.closePath();
      ctx.fillStyle = '#080e1e';
      ctx.fill();
    } else {
      ctx.fillStyle = '#080e1e';
      ctx.fillRect(
        snap(toScreenX(0)),
        snap(toScreenY(0)),
        snap(toScreenSizeX(100)),
        snap(toScreenSizeY(100)),
      );
    }

    // Pitch markings (standard pitch geometry normalized to 0-100 coordinate space)
    drawPitchMarkings(
      ctx,
      aspectRatio,
      w,
      m,
      toScreenX,
      toScreenY,
      toScreenSizeX,
      toScreenSizeY,
      projectObjToScreen,
      snap,
    );
  }

  // 2. Interpolated Frame Data
  const frame = getInterpolatedUnifiedSlideFrame(slides, timeMs);

  // 3. Zones (Vertex Morphing)
  Object.values(frame.zones).forEach((z) => {
    if (!z.visible) return;
    ctx.save();
    ctx.fillStyle = z.color || '#22c55e';
    ctx.strokeStyle = z.strokeColor || z.color || '#22c55e';
    ctx.lineWidth = Math.max(
      1.5,
      Math.round((z.strokeWidth || 1.5) * (w / 800)),
    );
    ctx.globalAlpha = z.opacity ?? 0.25;

    if (z.shapeType === 'polygon' && z.points.length > 2) {
      ctx.beginPath();
      const p0 = projectObjToScreen(z.points[0].x, z.points[0].y);
      ctx.moveTo(snap(p0.x), snap(p0.y));
      for (let i = 1; i < z.points.length; i++) {
        const pi = projectObjToScreen(z.points[i].x, z.points[i].y);
        ctx.lineTo(snap(pi.x), snap(pi.y));
      }
      ctx.closePath();
      ctx.fill();
      if (z.strokeWidth && z.strokeWidth > 0) {
        ctx.stroke();
      }
    } else if (z.shapeType === 'rect') {
      const zx = z.x ?? z.points[0]?.x ?? 20;
      const zy = z.y ?? z.points[0]?.y ?? 20;
      const zw = z.width ?? 30;
      const zh = z.height ?? 20;

      if (m) {
        const p1 = projectObjToScreen(zx, zy);
        const p2 = projectObjToScreen(zx + zw, zy);
        const p3 = projectObjToScreen(zx + zw, zy + zh);
        const p4 = projectObjToScreen(zx, zy + zh);
        ctx.beginPath();
        ctx.moveTo(snap(p1.x), snap(p1.y));
        ctx.lineTo(snap(p2.x), snap(p2.y));
        ctx.lineTo(snap(p3.x), snap(p3.y));
        ctx.lineTo(snap(p4.x), snap(p4.y));
        ctx.closePath();
        ctx.fill();
        if (z.strokeWidth && z.strokeWidth > 0) {
          ctx.stroke();
        }
      } else {
        const rx = snap(toScreenX(zx));
        const ry = snap(toScreenY(zy));
        const rw = snap(toScreenSizeX(zw));
        const rh = snap(toScreenSizeY(zh));
        ctx.fillRect(rx, ry, rw, rh);
        if (z.strokeWidth && z.strokeWidth > 0) {
          ctx.strokeRect(rx, ry, rw, rh);
        }
      }
    } else if (z.shapeType === 'ellipse') {
      const zx = z.x ?? 20;
      const zy = z.y ?? 20;
      const zw = z.width ?? 30;
      const zh = z.height ?? 20;
      const cx = zx + zw / 2;
      const cy = zy + zh / 2;
      const rx = zw / 2;
      const ry = zh / 2;

      if (m) {
        ctx.beginPath();
        const segments = 36;
        for (let i = 0; i <= segments; i++) {
          const angle = (Math.PI * 2 * i) / segments;
          const px = cx + Math.cos(angle) * rx;
          const py = cy + Math.sin(angle) * ry;
          const pt = projectObjToScreen(px, py);
          if (i === 0) {
            ctx.moveTo(snap(pt.x), snap(pt.y));
          } else {
            ctx.lineTo(snap(pt.x), snap(pt.y));
          }
        }
        ctx.closePath();
        ctx.fill();
        if (z.strokeWidth && z.strokeWidth > 0) {
          ctx.stroke();
        }
      } else {
        const scx = snap(toScreenX(cx));
        const scy = snap(toScreenY(cy));
        const sradX = snap(toScreenSizeX(rx));
        const sradY = snap(toScreenSizeY(ry));
        ctx.beginPath();
        ctx.ellipse(
          scx,
          scy,
          Math.max(1, sradX),
          Math.max(1, sradY),
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        if (z.strokeWidth && z.strokeWidth > 0) {
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  });

  // 4. Connect Lines between players
  Object.values(frame.players).forEach((p) => {
    if (!p.visible || !p.connectLines || p.connectLines.length === 0) return;
    const _p1 = projectObjToScreen(p.x, p.y);
    const px1 = snap(_p1.x);
    const py1 = snap(_p1.y);

    p.connectLines.forEach((conn) => {
      if (!conn.visible) return;
      const targetPlayer = frame.players[conn.toPlayerId];
      if (!targetPlayer?.visible) return;

      const _p2 = projectObjToScreen(targetPlayer.x, targetPlayer.y);
      const px2 = snap(_p2.x);
      const py2 = snap(_p2.y);

      const lineColor = conn.color || p.style?.color || '#3b82f6';
      const baseWidth = Math.max(
        2,
        Math.round((conn.strokeWidth || 2) * (w / 800)),
      );

      // 外側グロー層
      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = baseWidth + Math.round(4 * (w / 800));
      ctx.globalAlpha = Math.min(p.opacity, targetPlayer.opacity) * 0.6;
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = Math.round(8 * (w / 800));
      if (conn.lineStyle === 'dashed') {
        ctx.setLineDash([8, 5]);
      } else if (conn.lineStyle === 'dotted') {
        ctx.setLineDash([3, 4]);
      }
      ctx.beginPath();
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.stroke();
      ctx.restore();

      // コアライン本体
      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = baseWidth;
      ctx.globalAlpha = Math.min(p.opacity, targetPlayer.opacity) * 0.85;
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = Math.round(4 * (w / 800));
      if (conn.lineStyle === 'dashed') {
        ctx.setLineDash([8, 5]);
      } else if (conn.lineStyle === 'dotted') {
        ctx.setLineDash([3, 4]);
      }
      ctx.beginPath();
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.stroke();
      ctx.restore();
    });
  });

  // 5. Arrows
  Object.values(frame.arrows).forEach((a) => {
    if (!a.visible || a.points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = a.color || '#38bdf8';
    ctx.fillStyle = a.color || '#38bdf8';
    const arrowWidth = Math.max(
      2,
      Math.round((a.strokeWidth || 3) * (w / 800)),
    );
    ctx.lineWidth = arrowWidth;
    ctx.globalAlpha = a.opacity ?? 1;

    const _sa = projectObjToScreen(a.points[0].x, a.points[0].y);
    const sx = snap(_sa.x);
    const sy = snap(_sa.y);
    const _ea = projectObjToScreen(a.points[1].x, a.points[1].y);
    const ex = snap(_ea.x);
    const ey = snap(_ea.y);

    if (a.arrowType === 'pass' || a.arrowType === 'defend') {
      ctx.setLineDash([8, 5]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    if (a.curveType === 'curved' && a.controlPoint) {
      const _ca = projectObjToScreen(a.controlPoint.x, a.controlPoint.y);
      const cx = snap(_ca.x);
      const cy = snap(_ca.y);
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cx, cy, ex, ey);
      ctx.stroke();
    } else {
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    // Arrowhead
    ctx.setLineDash([]);
    const angle =
      a.curveType === 'curved' && a.controlPoint
        ? Math.atan2(
            ey - snap(projectObjToScreen(a.controlPoint.x, a.controlPoint.y).y),
            ex - snap(projectObjToScreen(a.controlPoint.x, a.controlPoint.y).x),
          )
        : Math.atan2(ey - sy, ex - sx);

    const headLen = Math.max(8, Math.round(w * 0.018));
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(
      ex - headLen * Math.cos(angle - Math.PI / 6),
      ey - headLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      ex - headLen * Math.cos(angle + Math.PI / 6),
      ey - headLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();

    // Subtle dark boundary on arrowhead for razor-sharp edge contrast
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = Math.max(1.5, Math.round(w * 0.0015));
    ctx.stroke();

    ctx.restore();
  });

  // 6. Players
  Object.values(frame.players).forEach((p) => {
    if (!p.visible) return;
    const _pp = projectObjToScreen(p.x, p.y);
    const px = snap(_pp.x);
    const py = snap(_pp.y);
    const sizeScale = p.style?.sizeScale ?? 1.0;
    const radius = Math.max(8, Math.round(w * 0.022 * sizeScale));

    ctx.save();
    ctx.globalAlpha = p.opacity;

    // Spotlight Beam (Focus)
    if (p.focus?.enabled) {
      const focusColor = p.focus.color || '#ffffff';
      const focusOpacity = (p.focus.opacity ?? 0.35) * p.opacity;
      const focusRadiusMultiplier = (p.focus.radius ?? 3) / 3;
      const ringWidth = radius * 2.3 * focusRadiusMultiplier;
      const spotlightScale = ringWidth / SPOTLIGHT_BEAM_BOTTOM_WIDTH;
      const tx = px - SPOTLIGHT_BEAM_BOTTOM_CENTER_X * spotlightScale;
      // フォーカスの最下部をリング最下部 (py + radius * 0.55) に一致させる
      const ringBottomY = py + radius * 0.55 * focusRadiusMultiplier;
      const ty = ringBottomY - SPOTLIGHT_BEAM_BOTTOM_MAX_Y * spotlightScale;

      ctx.save();
      if (typeof Path2D !== 'undefined') {
        const beamPath = new Path2D(SPOTLIGHT_BEAM_PATH);
        ctx.save();
        ctx.translate(tx, ty);
        ctx.scale(spotlightScale, spotlightScale);

        // 1. 光の柱（中央が透けるソフトグラデーションビーム）
        const grad = ctx.createLinearGradient(31.36, 5, 31.36, 100);
        const hex = focusColor.replace('#', '');
        const cr = Number.parseInt(hex.substring(0, 2), 16) || 255;
        const cg = Number.parseInt(hex.substring(2, 4), 16) || 255;
        const cb = Number.parseInt(hex.substring(4, 6), 16) || 255;

        grad.addColorStop(
          0,
          `rgba(${cr}, ${cg}, ${cb}, ${(focusOpacity * 0.95).toFixed(3)})`,
        );
        grad.addColorStop(
          0.25,
          `rgba(${cr}, ${cg}, ${cb}, ${(focusOpacity * 0.5).toFixed(3)})`,
        );
        grad.addColorStop(
          0.6,
          `rgba(${cr}, ${cg}, ${cb}, ${(focusOpacity * 0.22).toFixed(3)})`,
        );
        grad.addColorStop(
          0.9,
          `rgba(${cr}, ${cg}, ${cb}, ${(focusOpacity * 0.65).toFixed(3)})`,
        );
        grad.addColorStop(
          1,
          `rgba(${cr}, ${cg}, ${cb}, ${(focusOpacity * 0.95).toFixed(3)})`,
        );

        ctx.fillStyle = grad;
        ctx.fill(beamPath);

        ctx.restore();
      }
      ctx.restore();
    }

    // Vision Cone
    if (p.visionCone?.visible) {
      const cone = p.visionCone;
      const coneRadius = snap(toScreenSizeX(cone.radius || 20));
      const startAngle = cone.angleRad - cone.spreadRad / 2;
      const endAngle = cone.angleRad + cone.spreadRad / 2;
      const isRing = p.style?.markerType === 'ring';
      const rx = isRing ? radius * 1.15 : radius + 2;
      const ry = isRing ? radius * 0.55 : radius + 2;

      ctx.save();
      ctx.globalAlpha = (cone.opacity ?? 0.25) * p.opacity;
      ctx.fillStyle = cone.color || p.style?.color || '#3b82f6';
      ctx.beginPath();
      if (isRing) {
        const steps = 36;
        for (let i = 0; i <= steps; i++) {
          const a = startAngle + (i / steps) * (endAngle - startAngle);
          const x = px + coneRadius * Math.cos(a);
          const y = py + coneRadius * Math.sin(a);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        for (let i = steps; i >= 0; i--) {
          const a = startAngle + (i / steps) * (endAngle - startAngle);
          const x = px + rx * Math.cos(a);
          const y = py + ry * Math.sin(a);
          ctx.lineTo(x, y);
        }
      } else {
        ctx.moveTo(px, py);
        ctx.arc(px, py, coneRadius, startAngle, endAngle);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = cone.color || p.style?.color || '#3b82f6';
      ctx.lineWidth = Math.max(1, Math.round(w * 0.0015));
      ctx.stroke();
      ctx.restore();
    }

    // ── 100% Visual Parity with player-layer.tsx ──
    const isRingMarker = p.style?.markerType === 'ring';

    if (isRingMarker) {
      // ── 3D Foot Ring (立体足元楕円リング) ──
      const ringScale = (radius * 2) / MARKER_VIEWBOX_SIZE;
      const rtx = px - (MARKER_VIEWBOX_SIZE * ringScale) / 2;
      const rty = py - (MARKER_VIEWBOX_SIZE * ringScale) / 2;

      const ringColor =
        p.style?.color || (p.team === 'home' ? '#2563eb' : '#dc2626');

      if (typeof Path2D !== 'undefined') {
        ctx.save();
        ctx.translate(rtx, rty);
        ctx.scale(ringScale, ringScale);

        // 各パーツから外側にふんわり光が漏れ出るグロー層
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = ringColor;
        ctx.shadowBlur = Math.round(8 * (w / 800));
        ctx.globalAlpha = p.opacity * 0.6;
        for (const pathStr of MARKER_PATHS) {
          const pathObj = new Path2D(pathStr);
          ctx.stroke(pathObj);
        }

        // 各パーツ本体 (シャープな発光コア)
        ctx.fillStyle = ringColor;
        ctx.shadowColor = ringColor;
        ctx.shadowBlur = Math.round(4 * (w / 800));
        ctx.globalAlpha = p.opacity;
        for (const pathStr of MARKER_PATHS) {
          const pathObj = new Path2D(pathStr);
          ctx.fill(pathObj);
        }
        ctx.restore();
      }

      // Ring Center Glow Ellipse (各パーツと同じ発光グロー効果)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(px, py, radius * 0.72, radius * 0.24, 0, 0, Math.PI * 2);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = Math.round(2 * (w / 800));
      ctx.globalAlpha = p.opacity * 0.6;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = Math.round(8 * (w / 800));
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(px, py, radius * 0.68, radius * 0.22, 0, 0, Math.PI * 2);
      ctx.fillStyle = ringColor;
      ctx.globalAlpha = p.opacity * 0.45;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = Math.round(4 * (w / 800));
      ctx.fill();
      ctx.restore();

      // Shirt Number in Ring
      if (p.style?.insideContent !== 'none' && p.shirtNo) {
        const numScale = p.style?.numberSizeScale ?? 1.0;
        const numFontSize = Math.max(8, Math.round(radius * 0.75 * numScale));
        ctx.font = `bold ${numFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(p.shirtNo, px, py - radius * 0.1);
      }
    } else {
      // ── 2D Player Circle ──
      // 1. Player Main Body (Team Color)
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle =
        p.style?.color || (p.team === 'home' ? '#2563eb' : '#dc2626');
      ctx.fill();

      // 2. Player Standard Stroke (White Ring)
      const strokeWidth = p.style?.strokeWidth ?? 2;
      ctx.lineWidth = Math.max(1.5, Math.round(strokeWidth * (w / 800)));
      ctx.strokeStyle = p.style?.strokeColor || '#ffffff';
      ctx.stroke();

      // 3. Shirt Number (Clean pure white text matching player-layer.tsx without strokeText)
      const showInsideNumber =
        (p.style?.insideContent === 'number' ||
          p.style?.insideContent === undefined) &&
        p.shirtNo;

      if (showInsideNumber && p.shirtNo) {
        const numScale = p.style?.numberSizeScale ?? 1.0;
        const numFontSize = Math.max(8, Math.round(radius * 0.9 * numScale));
        ctx.font = `bold ${numFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(p.shirtNo, px, py);
      }
    }

    // 4. Player Name / Number Label (Matching player-layer.tsx bottom label)
    const showName =
      (p.style?.bottomLabel === 'name' || p.style?.bottomLabel === undefined) &&
      p.name;
    const showBottomNum = p.style?.bottomLabel === 'number' && p.shirtNo;
    if (showName || showBottomNum) {
      const labelText = showName
        ? getLastName(p.name ?? '')
        : `#${p.shirtNo ?? ''}`;
      const labelScale = p.style?.labelSizeScale ?? 1.0;
      const fontSize = Math.max(8, Math.round(radius * 0.65 * labelScale));
      const textY = snap(py + radius + fontSize * 0.7 + 3);

      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Dark background outline (matching stroke="#020617" strokeWidth=1.5 in player-layer.tsx)
      if (typeof ctx.strokeText === 'function') {
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.25));
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(labelText, px, textY);
      }

      // Bright white foreground text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, px, textY);
    }

    ctx.restore();
  });

  // 7. Soccer Ball (Realistic Vector Ball with High-Speed Rendering)
  if (frame.ball.visible) {
    const _bp = projectObjToScreen(frame.ball.x, frame.ball.y);
    const bx = snap(_bp.x);
    const by = snap(_bp.y);
    const ballRadius = Math.max(5, Math.round(w * 0.013));

    ctx.save();
    ctx.globalAlpha = frame.ball.opacity;

    // Dark outer contrast ring
    const outerBallRadius = snap(
      ballRadius + Math.max(1.5, Math.round(ballRadius * 0.15)),
    );
    ctx.beginPath();
    ctx.arc(bx, by, outerBallRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#020617';
    ctx.fill();

    // Ball Base (Crisp white leather)
    ctx.beginPath();
    ctx.arc(bx, by, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, Math.round(ballRadius * 0.14));
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Ball Center Pentagons (Realistic football pattern)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(bx, by, snap(ballRadius * 0.38), 0, Math.PI * 2);
    ctx.fill();

    // 3 Radially subtle seam lines
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = Math.max(1, Math.round(ballRadius * 0.1));
    for (let angle = 0; angle < Math.PI * 2; angle += (Math.PI * 2) / 3) {
      ctx.beginPath();
      ctx.moveTo(
        bx + Math.cos(angle) * (ballRadius * 0.38),
        by + Math.sin(angle) * (ballRadius * 0.38),
      );
      ctx.lineTo(
        bx + Math.cos(angle) * (ballRadius * 0.85),
        by + Math.sin(angle) * (ballRadius * 0.85),
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  // 8. Texts (Crisp Outlined Text Rendering)
  Object.values(frame.texts).forEach((t) => {
    if (!t.visible || !t.content) return;
    const _tp = projectObjToScreen(t.x, t.y);
    const tx = snap(_tp.x);
    const ty = snap(_tp.y);

    ctx.save();
    ctx.globalAlpha = t.opacity ?? 1;
    const fontStyle = `${t.bold ? 'bold ' : ''}${t.italic ? 'italic ' : ''}`;
    const fontSize = Math.max(12, Math.round((t.fontSize || 16) * (w / 800)));
    ctx.font = `${fontStyle}${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Dark stroke outline for readability (if supported)
    if (typeof ctx.strokeText === 'function') {
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.32));
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(t.content, tx, ty);
    }

    // Foreground text fill
    ctx.fillStyle = t.color || '#ffffff';
    ctx.fillText(t.content, tx, ty);
    ctx.restore();
  });

  // Restore clipping context
  ctx.restore();
}
