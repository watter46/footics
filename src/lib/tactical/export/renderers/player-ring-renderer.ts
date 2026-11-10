import {
  MARKER_PATHS,
  MARKER_VIEWBOX_SIZE,
} from '@/lib/tactical/marker-assets';
import type { InterpolatedPlayerState } from '@/lib/tactical/unified-interpolation';
import type { AnyCanvasRenderingContext2D } from './renderer-context';

const CACHED_COMBINED_MARKER_PATH: Path2D | null =
  typeof Path2D !== 'undefined' ? new Path2D(MARKER_PATHS.join(' ')) : null;

export function renderPlayerRingMarker(
  ctx: AnyCanvasRenderingContext2D,
  p: InterpolatedPlayerState,
  px: number,
  py: number,
  radius: number,
  scale: number,
  markerColor: string,
): void {
  if (p.style?.markerType === 'ring') {
    // ── 3D Foot Ring (立体足元楕円リング) ──
    const ringScale = (radius * 2) / MARKER_VIEWBOX_SIZE;
    const rtx = px - (MARKER_VIEWBOX_SIZE * ringScale) / 2;
    const rty = py - (MARKER_VIEWBOX_SIZE * ringScale) / 2;

    if (CACHED_COMBINED_MARKER_PATH) {
      ctx.save();
      ctx.translate(rtx, rty);
      ctx.scale(ringScale, ringScale);

      // 各パーツから外側にふんわり光が漏れ出るグロー層
      ctx.strokeStyle = markerColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = markerColor;
      ctx.shadowBlur = Math.round(8 * scale);
      ctx.globalAlpha = p.opacity * 0.6;
      ctx.stroke(CACHED_COMBINED_MARKER_PATH);

      // 各パーツ本体 (シャープな発光コア)
      ctx.fillStyle = markerColor;
      ctx.shadowBlur = Math.round(4 * scale);
      ctx.globalAlpha = p.opacity;
      ctx.fill(CACHED_COMBINED_MARKER_PATH);
      ctx.restore();
    }

    // Ring Center Glow Ellipse (各パーツと同じ発光グロー効果)
    ctx.save();
    ctx.strokeStyle = markerColor;
    ctx.fillStyle = markerColor;
    ctx.shadowColor = markerColor;
    ctx.lineWidth = Math.round(2 * scale);
    ctx.shadowBlur = Math.round(8 * scale);
    ctx.globalAlpha = p.opacity * 0.6;
    ctx.beginPath();
    ctx.ellipse(px, py, radius * 0.72, radius * 0.24, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = p.opacity * 0.45;
    ctx.shadowBlur = Math.round(4 * scale);
    ctx.beginPath();
    ctx.ellipse(px, py, radius * 0.68, radius * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (p.style?.markerType === 'ring-fade') {
    // ── Ring Fade (フェード足元楕円リング) ──
    ctx.save();
    ctx.strokeStyle = markerColor;
    ctx.fillStyle = markerColor;
    ctx.shadowColor = markerColor;

    // 外側フェードグロー
    ctx.lineWidth = Math.max(3 * scale, 3);
    ctx.shadowBlur = Math.round(10 * scale);
    ctx.globalAlpha = p.opacity * 0.5;
    ctx.beginPath();
    ctx.ellipse(px, py, radius * 0.95, radius * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 内側コア楕円リング
    ctx.lineWidth = Math.max(2 * scale, 2);
    ctx.shadowBlur = Math.round(4 * scale);
    ctx.globalAlpha = p.opacity * 0.85;
    ctx.beginPath();
    ctx.ellipse(px, py, radius * 0.95, radius * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 足元中央の薄いフェード塗り
    ctx.globalAlpha = p.opacity * 0.15;
    ctx.beginPath();
    ctx.ellipse(px, py, radius * 0.9, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
