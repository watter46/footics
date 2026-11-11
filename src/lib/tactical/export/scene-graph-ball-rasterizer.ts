import type { ResolvedBillboardBallItem } from '@/lib/tactical/compiler/scene-graph-dto';
import {
  SOCCER_BALL_PATCH_PATHS,
  SOCCER_BALL_SEAM_LINES,
} from './renderers/ball-renderer';
import type { AnyCanvasRenderingContext2D } from './renderers/renderer-context';

const CACHED_SOCCER_BALL_PATCH_PATHS: readonly Path2D[] =
  typeof Path2D !== 'undefined'
    ? SOCCER_BALL_PATCH_PATHS.map((p) => new Path2D(p))
    : [];

export function drawSoccerBall(
  ctx: AnyCanvasRenderingContext2D,
  ball: ResolvedBillboardBallItem,
): void {
  if (!ball.visible || ball.opacity <= 0) return;

  const bx = ball.positionPx.x;
  const by = ball.positionPx.y;
  const ballRadius = ball.radiusPx;

  ctx.save();
  ctx.globalAlpha = ball.opacity;

  const ballScale = (ballRadius * 2) / 100;
  ctx.translate(bx, by);
  ctx.scale(ballScale, ballScale);
  ctx.translate(-50, -50);

  // 球面ラジアルグラデーション (白パネル)
  let ballGrad: CanvasGradient | string = '#ffffff';
  if (typeof ctx.createRadialGradient === 'function') {
    const grad = ctx.createRadialGradient(35, 32, 0, 35, 32, 68);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.55, '#f8fafc');
    grad.addColorStop(0.85, '#cbd5e1');
    grad.addColorStop(1, '#64748b');
    ballGrad = grad;
  }

  // 陰影ラジアルグラデーション (黒パネル)
  let patchGrad: CanvasGradient | string = '#0f172a';
  if (typeof ctx.createRadialGradient === 'function') {
    const grad = ctx.createRadialGradient(35, 35, 0, 35, 35, 65);
    grad.addColorStop(0, '#334155');
    grad.addColorStop(0.7, '#1e293b');
    grad.addColorStop(1, '#090d16');
    patchGrad = grad;
  }

  // 外周球体ベース & ドロップシャドウ
  ctx.beginPath();
  ctx.arc(50, 50, 47.5, 0, Math.PI * 2);
  ctx.fillStyle = ballGrad;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#0f172a';
  ctx.stroke();

  // 白パネル間のシームライン (縫い目 15本)
  ctx.save();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of SOCCER_BALL_SEAM_LINES) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();
  ctx.restore();

  // 黒五角形パッチ群 (中心 + 外周5箇所)
  ctx.beginPath();
  ctx.moveTo(50, 32.5);
  ctx.lineTo(66.6, 44.6);
  ctx.lineTo(60.3, 64.0);
  ctx.lineTo(39.7, 64.0);
  ctx.lineTo(33.4, 44.6);
  ctx.closePath();
  ctx.fillStyle = patchGrad;
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  if (CACHED_SOCCER_BALL_PATCH_PATHS.length > 0) {
    for (const patchPath of CACHED_SOCCER_BALL_PATCH_PATHS) {
      ctx.fillStyle = patchGrad;
      ctx.fill(patchPath);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.stroke(patchPath);
    }
  }

  // 球面光沢ハイライト
  ctx.save();
  ctx.translate(38, 28);
  if (typeof ctx.rotate === 'function') {
    ctx.rotate((-30 * Math.PI) / 180);
  }
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}
