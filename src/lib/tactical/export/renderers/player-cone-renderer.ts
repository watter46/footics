import type { InterpolatedPlayerState } from '@/lib/tactical/unified-interpolation';
import type { FrameRenderContext } from './renderer-context';

/**
 * Draws player vision cone (2D arc or 3D projected perspective cone) onto canvas context.
 */
export function renderPlayerVisionCone(
  context: FrameRenderContext,
  p: InterpolatedPlayerState,
  px: number,
  py: number,
  radius: number,
  isRingMarker: boolean,
): void {
  const isVisionConeVisible =
    p.visionCone?.visible || (p.visionCone as { enabled?: boolean })?.enabled;
  if (!isVisionConeVisible || !p.visionCone) return;

  const { ctx, w, h, m, projectObjToScreen, snap, toScreenSizeX } = context;
  const cone = p.visionCone;
  const coneRadius = snap(toScreenSizeX(cone.radius || 20));
  const startAngle = cone.angleRad - cone.spreadRad / 2;
  const endAngle = cone.angleRad + cone.spreadRad / 2;
  const rx = isRingMarker ? radius * 1.15 : radius + 2;
  const ry = isRingMarker ? radius * 0.55 : radius + 2;

  ctx.save();
  ctx.globalAlpha = (cone.opacity ?? 0.25) * p.opacity;
  ctx.fillStyle = cone.color || p.style?.color || '#3b82f6';
  ctx.beginPath();

  const getArcPoint = (a: number) => {
    if (m) {
      const nx = p.x + ((Math.cos(a) * coneRadius) / w) * 100;
      const ny = p.y + ((Math.sin(a) * coneRadius) / h) * 100;
      return projectObjToScreen(nx, ny);
    }
    return {
      x: px + coneRadius * Math.cos(a),
      y: py + coneRadius * Math.sin(a),
    };
  };

  if (!m && !isRingMarker) {
    ctx.moveTo(px, py);
    ctx.arc(px, py, coneRadius, startAngle, endAngle);
  } else {
    const steps = 36;
    if (!isRingMarker) ctx.moveTo(px, py);
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (i / steps) * (endAngle - startAngle);
      const pt = getArcPoint(a);
      if (isRingMarker && i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    if (isRingMarker) {
      for (let i = steps; i >= 0; i--) {
        const a = startAngle + (i / steps) * (endAngle - startAngle);
        ctx.lineTo(px + rx * Math.cos(a), py + ry * Math.sin(a));
      }
    }
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = cone.color || p.style?.color || '#3b82f6';
  ctx.lineWidth = Math.max(1, Math.round(w * 0.0015));
  ctx.stroke();
  ctx.restore();
}
