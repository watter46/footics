import type {
  InterpolatedArrowState,
  InterpolatedPlayerState,
} from '@/lib/tactical/unified-interpolation';
import type { FrameRenderContext } from './renderer-context';

/**
 * Draws connect lines between players onto canvas context.
 */
export function renderConnectLines(
  context: FrameRenderContext,
  players: Record<string, InterpolatedPlayerState>,
): void {
  const { ctx, w, projectObjToScreen, snap } = context;

  Object.values(players).forEach((p) => {
    if (!p.visible || !p.connectLines || p.connectLines.length === 0) return;
    const _p1 = projectObjToScreen(p.x, p.y);
    const px1 = snap(_p1.x);
    const py1 = snap(_p1.y);

    p.connectLines.forEach((conn) => {
      if (!conn.visible) return;
      const targetPlayer = players[conn.toPlayerId];
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
}

/**
 * Draws tactical arrows onto canvas context.
 */
export function renderArrows(
  context: FrameRenderContext,
  arrows: Record<string, InterpolatedArrowState>,
): void {
  const { ctx, w, projectObjToScreen, snap } = context;

  Object.values(arrows).forEach((a) => {
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

    const isCurved =
      (a.curveType === 'curved' ||
        a.curveType === 'arc' ||
        a.controlPoint !== undefined) &&
      a.controlPoint !== undefined;

    ctx.beginPath();
    if (isCurved && a.controlPoint) {
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
      isCurved && a.controlPoint
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
}
