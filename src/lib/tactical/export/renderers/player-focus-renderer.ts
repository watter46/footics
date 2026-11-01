import {
  SPOTLIGHT_BEAM_BOTTOM_CENTER_X,
  SPOTLIGHT_BEAM_BOTTOM_MAX_Y,
  SPOTLIGHT_BEAM_BOTTOM_WIDTH,
  SPOTLIGHT_BEAM_PATH,
} from '@/lib/tactical/marker-assets';
import type { InterpolatedPlayerState } from '@/lib/tactical/unified-interpolation';
import type { AnyCanvasRenderingContext2D } from './renderer-context';

const CACHED_SPOTLIGHT_BEAM_PATH: Path2D | null =
  typeof Path2D !== 'undefined' ? new Path2D(SPOTLIGHT_BEAM_PATH) : null;

/**
 * Draws player focus effect: 3D spotlight beam for ring markers, 2D neon glow ring for circle markers.
 */
export function renderPlayerFocus(
  ctx: AnyCanvasRenderingContext2D,
  p: InterpolatedPlayerState,
  px: number,
  py: number,
  radius: number,
  scale: number,
  isRingMarker: boolean,
): void {
  if (!p.focus?.enabled) return;

  const focusColor = p.focus.color || '#ffffff';
  const focusOpacity = (p.focus.opacity ?? 0.35) * p.opacity;
  const mult = (p.focus.radius ?? 3) / 3;

  if (isRingMarker) {
    if (!CACHED_SPOTLIGHT_BEAM_PATH) return;
    const ringWidth = radius * 2.3 * mult;
    const spScale = ringWidth / SPOTLIGHT_BEAM_BOTTOM_WIDTH;
    const tx = px - SPOTLIGHT_BEAM_BOTTOM_CENTER_X * spScale;
    const ringBottomY = py + radius * 0.55 * mult;
    const ty = ringBottomY - SPOTLIGHT_BEAM_BOTTOM_MAX_Y * spScale;

    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(spScale, spScale);

    const grad = ctx.createLinearGradient(31.36, 5, 31.36, 100);
    const hex = focusColor.replace('#', '');
    const [cr, cg, cb] = [0, 2, 4].map(
      (i) => Number.parseInt(hex.slice(i, i + 2), 16) || 255,
    );

    const stops = [
      [0, 0.95],
      [0.25, 0.5],
      [0.6, 0.22],
      [0.9, 0.65],
      [1, 0.95],
    ] as const;
    for (const [offset, mul] of stops) {
      grad.addColorStop(
        offset,
        `rgba(${cr}, ${cg}, ${cb}, ${(focusOpacity * mul).toFixed(3)})`,
      );
    }

    ctx.fillStyle = grad;
    ctx.fill(CACHED_SPOTLIGHT_BEAM_PATH);
    ctx.restore();
  } else {
    // 2Dサークルマーカー用 外周2Dネオングローリング
    const glowThickness = Math.max(6 * scale, radius * 0.42);
    const centerRadius = radius + glowThickness * 0.45;
    const outerRadius = radius + glowThickness * 1.1;

    ctx.save();

    // 1. 光だまり円 (fill)
    ctx.save();
    ctx.globalAlpha = focusOpacity * 0.16;
    ctx.fillStyle = focusColor;
    ctx.beginPath();
    ctx.arc(px, py, outerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. ブルームリング (stroke)
    ctx.save();
    ctx.globalAlpha = focusOpacity * 0.55;
    ctx.strokeStyle = focusColor;
    ctx.lineWidth = glowThickness * 0.9;
    ctx.shadowColor = focusColor;
    ctx.shadowBlur = 16 * scale;
    ctx.beginPath();
    ctx.arc(px, py, centerRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 3. コア発光リング (stroke)
    ctx.save();
    ctx.globalAlpha = Math.min(1, focusOpacity * 1.3);
    ctx.strokeStyle = focusColor;
    ctx.lineWidth = Math.max(2.5 * scale, glowThickness * 0.35);
    ctx.shadowColor = focusColor;
    ctx.shadowBlur = 8 * scale;
    ctx.beginPath();
    ctx.arc(px, py, centerRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }
}
