import type { InterpolatedZoneState } from '@/lib/tactical/unified-interpolation';
import type { FrameRenderContext } from './renderer-context';

/**
 * Draws zones (polygons, rects, ellipses) with vertex morphing onto canvas context.
 */
export function renderZones(
  context: FrameRenderContext,
  zones: Record<string, InterpolatedZoneState>,
): void {
  const {
    ctx,
    w,
    m,
    projectObjToScreen,
    snap,
    toScreenX,
    toScreenY,
    toScreenSizeX,
    toScreenSizeY,
  } = context;

  Object.values(zones).forEach((z) => {
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
}
