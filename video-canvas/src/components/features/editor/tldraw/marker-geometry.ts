import { Vec } from 'tldraw';
import {
  MARKER_RING_RX,
  MARKER_RING_RY,
  MARKER_SVG_SIZE,
} from './marker-styles';

// 親マーカーのサイズから、配置の中心とオフセット付きのリング半径を計算する
export function getMarkerLayoutDimensions(w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  const scale = w / MARKER_SVG_SIZE;
  // 点線を越えるオフセット (4px 程度をスケール考慮)
  const offset = 4 * scale;
  const rrx = MARKER_RING_RX * scale + offset;
  const rry = MARKER_RING_RY * scale + offset;
  return { cx, cy, scale, rrx, rry };
}

export function getArrowLayout(
  cx: number,
  cy: number,
  rrx: number,
  rry: number,
  arrow: { angle: number; length: number; bend: number },
) {
  const start = new Vec(
    cx + rrx * Math.cos(arrow.angle),
    cy + rry * Math.sin(arrow.angle),
  );
  const end = start.clone().add(Vec.FromAngle(arrow.angle).mul(arrow.length));

  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  const nx = -(end.y - start.y) / arrow.length;
  const ny = (end.x - start.x) / arrow.length;
  const bendPoint = new Vec(mx + nx * arrow.bend, my + ny * arrow.bend);
  const cp = new Vec(mx + 2 * arrow.bend * nx, my + 2 * arrow.bend * ny);

  return { start, end, cp, bendPoint };
}

export function getFovLayout(
  cx: number,
  cy: number,
  rrx: number,
  rry: number,
  fov: { angle: number; direction: number; length: number },
) {
  const halfAngle = fov.angle / 2;
  const startAngle = fov.direction - halfAngle;

  const orx = rrx + fov.length;
  const ory = rry + fov.length;

  const samples = 12;
  const innerPoints: Vec[] = [];
  const outerPoints: Vec[] = [];
  for (let j = 0; j <= samples; j++) {
    const a = startAngle + (fov.angle * j) / samples;
    innerPoints.push(new Vec(cx + rrx * Math.cos(a), cy + rry * Math.sin(a)));
    outerPoints.push(new Vec(cx + orx * Math.cos(a), cy + ory * Math.sin(a)));
  }

  const handle = new Vec(
    cx + (rrx + fov.length) * Math.cos(fov.direction),
    cy + (rry + fov.length) * Math.sin(fov.direction),
  );

  return { innerPoints, outerPoints, handle };
}
