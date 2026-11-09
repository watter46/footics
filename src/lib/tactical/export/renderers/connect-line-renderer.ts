import type { InterpolatedPlayerState } from '@/lib/tactical/unified-interpolation';
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
