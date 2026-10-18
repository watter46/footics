/**
 * wavy-arrow-math.ts
 * 矢印・波線描画のための幾何計算ヘルパー
 */

export function getQuadraticBezierPoints(
  startX: number,
  startY: number,
  cpX: number,
  cpY: number,
  endX: number,
  endY: number,
  steps = 30,
): number[] {
  const points: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * endX;
    const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * endY;
    points.push(x, y);
  }
  return points;
}

export function getWavyPoints(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  wavelength = 24,
  amplitude = 7,
): number[] {
  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.hypot(dx, dy);
  if (dist < 5) return [startX, startY, endX, endY];

  const ux = dx / dist;
  const uy = dy / dist;
  const perpX = -uy;
  const perpY = ux;

  // 始点と終点付近は振幅をスムーズに減衰
  const numCycles = Math.max(1, Math.round(dist / wavelength));
  const steps = numCycles * 16;
  const points: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const baseDist = t * dist;
    const bx = startX + ux * baseDist;
    const by = startY + uy * baseDist;

    // 端部でのテーパー (0 -> 1 -> 0)
    const envelope = Math.sin(t * Math.PI);
    const wave = Math.sin(t * numCycles * Math.PI * 2) * amplitude * envelope;

    points.push(bx + perpX * wave, by + perpY * wave);
  }

  return points;
}
