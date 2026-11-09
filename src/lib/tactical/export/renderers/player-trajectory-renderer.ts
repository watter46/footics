import type { InterpolatedPlayerState } from '@/lib/tactical/unified-interpolation';
import type { FrameRenderContext } from './renderer-context';

/**
 * Draws player ghost movement trajectory (start marker and following line) onto canvas context.
 */
export function renderPlayerTrajectory(
  context: FrameRenderContext,
  p: InterpolatedPlayerState,
  px: number,
  py: number,
  scale: number,
): void {
  const trajectoryEffect = p.trajectoryEffect;
  if (!trajectoryEffect?.enabled || !p.startPos) return;

  const startPos = p.startPos;
  const endPos = p.endPos ?? { x: p.x, y: p.y };
  const totalMoveDist = Math.hypot(
    endPos.x - startPos.x,
    endPos.y - startPos.y,
  );

  // 始点と終点がほぼ同一（移動していない）場合は描画しない
  if (totalMoveDist < 0.1) return;

  const distToEnd = Math.hypot(p.x - endPos.x, p.y - endPos.y);
  const isArrived = distToEnd < 0.05;

  // auto-hide かつ到達済みの場合は非表示
  if (trajectoryEffect.exitAction === 'auto-hide' && isArrived) return;

  const { ctx, projectObjToScreen, snap } = context;
  const _sp = projectObjToScreen(startPos.x, startPos.y);
  const spx = snap(_sp.x);
  const spy = snap(_sp.y);

  const color = trajectoryEffect.color ?? p.style?.color ?? '#3b82f6';
  const isDashed = trajectoryEffect.lineStyle === 'dashed';

  ctx.save();
  ctx.globalAlpha = 0.8 * p.opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, Math.round(2 * scale));

  // 追従ライン（始点から現在位置 px, py まで）
  ctx.beginPath();
  if (isDashed) {
    ctx.setLineDash([6 * scale, 4 * scale]);
  } else {
    ctx.setLineDash([]);
  }
  ctx.moveTo(spx, spy);
  ctx.lineTo(px, py);
  ctx.stroke();

  // 始点マーカー（●）
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(spx, spy, Math.max(4, Math.round(6 * scale)), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
