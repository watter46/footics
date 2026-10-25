import type { InterpolatedBallState } from '@/lib/tactical/unified-interpolation';
import type { FrameRenderContext } from './renderer-context';

export const SOCCER_BALL_PATCH_PATHS = [
  'M 36.5,5.2 A 47.5,47.5 0 0,1 63.5,5.2 L 68.0,21.5 L 50.0,16.5 L 32.0,21.5 Z',
  'M 87.8,25.2 A 47.5,47.5 0 0,1 97.2,50.0 L 84.5,58.5 L 80.5,39.5 L 68.0,21.5 Z',
  'M 82.5,76.8 A 47.5,47.5 0 0,1 59.8,95.5 L 50.0,84.0 L 69.5,76.5 L 84.5,58.5 Z',
  'M 40.2,95.5 A 47.5,47.5 0 0,1 17.5,76.8 L 15.5,58.5 L 30.5,76.5 L 50.0,84.0 Z',
  'M 2.8,50.0 A 47.5,47.5 0 0,1 12.2,25.2 L 32.0,21.5 L 19.5,39.5 L 15.5,58.5 Z',
] as const;

export const SOCCER_BALL_SEAM_LINES: readonly [
  number,
  number,
  number,
  number,
][] = [
  // 中心から外周への連結線
  [50, 32.5, 50, 16.5],
  [66.6, 44.6, 80.5, 39.5],
  [60.3, 64.0, 69.5, 76.5],
  [39.7, 64.0, 30.5, 76.5],
  [33.4, 44.6, 19.5, 39.5],
  // 外周ヘキサゴン連結線
  [50, 16.5, 68.0, 21.5],
  [80.5, 39.5, 84.5, 58.5],
  [69.5, 76.5, 50.0, 84.0],
  [30.5, 76.5, 15.5, 58.5],
  [19.5, 39.5, 32.0, 21.5],
  [32.0, 21.5, 50.0, 16.5],
  [68.0, 21.5, 80.5, 39.5],
  [84.5, 58.5, 69.5, 76.5],
  [50.0, 84.0, 30.5, 76.5],
  [15.5, 58.5, 19.5, 39.5],
];

const CACHED_SOCCER_BALL_PATCH_PATHS: readonly Path2D[] =
  typeof Path2D !== 'undefined'
    ? SOCCER_BALL_PATCH_PATHS.map((p) => new Path2D(p))
    : [];

/**
 * Draws realistic 3D soccer ball onto canvas context.
 */
export function renderBall(
  context: FrameRenderContext,
  ball: InterpolatedBallState,
): void {
  if (!ball.visible) return;

  const { ctx, w, h, projectObjToScreen, snap } = context;

  const _bp = projectObjToScreen(ball.x, ball.y);
  const bx = snap(_bp.x);
  const by = snap(_bp.y);
  const ballRadius = Math.max(8, Math.round(Math.min(w, h) * 0.022));

  ctx.save();
  ctx.globalAlpha = ball.opacity;

  // 100x100 viewBox スケール変換
  const ballScale = (ballRadius * 2) / 100;
  ctx.translate(bx - 50 * ballScale, by - 50 * ballScale);
  ctx.scale(ballScale, ballScale);

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
  // 1. 中央の正五角形
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

  // 2〜6. 外周5パッチ
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
