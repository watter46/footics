import type {
  PitchBoundaryConfig,
  PitchLayoutGeometry,
} from '@/lib/tactical/pitch-geometry';
import type { FrameRenderContext } from './renderer-context';

export type PitchGeometryData = PitchLayoutGeometry & {
  config: PitchBoundaryConfig;
};

/**
 * Renders 3D projected pitch markings.
 */
export function renderPitchMarkings3D(
  context: FrameRenderContext,
  geom: PitchGeometryData,
): void {
  const { ctx, projectObjToScreen, snap } = context;

  const {
    pitchLeft,
    pitchTop,
    pitchWidth,
    pitchHeight,
    centerX,
    centerY,
    meterScale,
    centerCircleRadius,
    paDepth,
    paWidth,
    gaDepth,
    gaWidth,
    penaltySpotDist,
    cornerArcRadius,
    config,
  } = geom;

  const isHorizontal = config.orientation === 'horizontal';
  const left = pitchLeft;
  const right = pitchLeft + pitchWidth;
  const top = pitchTop;
  const bottom = pitchTop + pitchHeight;
  const r = centerCircleRadius;
  const arcAngle = Math.acos(
    Math.min(1, Math.max(-1, (paDepth - penaltySpotDist) / r)),
  );

  const toNormX = (svgX: number) => (svgX / config.widthPx) * 100;
  const toNormY = (svgY: number) => (svgY / config.heightPx) * 100;

  const projectPitch = (vx: number, vy: number) =>
    projectObjToScreen(toNormX(vx), toNormY(vy));

  const draw3DLine = (x1: number, y1: number, x2: number, y2: number) => {
    const p1 = projectPitch(x1, y1);
    const p2 = projectPitch(x2, y2);
    ctx.beginPath();
    ctx.moveTo(snap(p1.x), snap(p1.y));
    ctx.lineTo(snap(p2.x), snap(p2.y));
    ctx.stroke();
  };

  const draw3DQuad = (
    qx: number,
    qy: number,
    qw: number,
    qh: number,
    fill = false,
    stroke = true,
  ) => {
    const p1 = projectPitch(qx, qy);
    const p2 = projectPitch(qx + qw, qy);
    const p3 = projectPitch(qx + qw, qy + qh);
    const p4 = projectPitch(qx, qy + qh);
    ctx.beginPath();
    ctx.moveTo(snap(p1.x), snap(p1.y));
    ctx.lineTo(snap(p2.x), snap(p2.y));
    ctx.lineTo(snap(p3.x), snap(p3.y));
    ctx.lineTo(snap(p4.x), snap(p4.y));
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  };

  const draw3DArc = (
    cx: number,
    cy: number,
    radius: number,
    startAngle = 0,
    endAngle = Math.PI * 2,
    segments = 36,
  ) => {
    ctx.beginPath();
    const angleSpan = endAngle - startAngle;
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (angleSpan * i) / segments;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      const pt = projectPitch(px, py);
      if (i === 0) {
        ctx.moveTo(snap(pt.x), snap(pt.y));
      } else {
        ctx.lineTo(snap(pt.x), snap(pt.y));
      }
    }
    ctx.stroke();
  };

  const draw3DSpot = (cx: number, cy: number, radius: number) => {
    ctx.save();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    const segments = 16;
    for (let i = 0; i <= segments; i++) {
      const angle = (Math.PI * 2 * i) / segments;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      const pt = projectPitch(px, py);
      if (i === 0) {
        ctx.moveTo(snap(pt.x), snap(pt.y));
      } else {
        ctx.lineTo(snap(pt.x), snap(pt.y));
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Outer Pitch Lines (Touchlines & Goal lines)
  draw3DQuad(left, top, pitchWidth, pitchHeight);

  if (isHorizontal) {
    draw3DLine(centerX, top, centerX, bottom);
    draw3DArc(centerX, centerY, r, 0, Math.PI * 2, 48);
    draw3DSpot(centerX, centerY, Math.max(2, 0.4 * meterScale));
    draw3DQuad(left, centerY - paWidth / 2, paDepth, paWidth);
    draw3DQuad(right - paDepth, centerY - paWidth / 2, paDepth, paWidth);
    draw3DQuad(left, centerY - gaWidth / 2, gaDepth, gaWidth);
    draw3DQuad(right - gaDepth, centerY - gaWidth / 2, gaDepth, gaWidth);
    draw3DSpot(left + penaltySpotDist, centerY, Math.max(2, 0.3 * meterScale));
    draw3DSpot(right - penaltySpotDist, centerY, Math.max(2, 0.3 * meterScale));
    draw3DArc(left + penaltySpotDist, centerY, r, -arcAngle, arcAngle, 24);
    draw3DArc(
      right - penaltySpotDist,
      centerY,
      r,
      Math.PI - arcAngle,
      Math.PI + arcAngle,
      24,
    );
    draw3DArc(left, top, cornerArcRadius, 0, Math.PI / 2, 12);
    draw3DArc(right, top, cornerArcRadius, Math.PI / 2, Math.PI, 12);
    draw3DArc(left, bottom, cornerArcRadius, -Math.PI / 2, 0, 12);
    draw3DArc(right, bottom, cornerArcRadius, Math.PI, Math.PI * 1.5, 12);
  } else {
    draw3DLine(left, centerY, right, centerY);
    draw3DArc(centerX, centerY, r, 0, Math.PI * 2, 48);
    draw3DSpot(centerX, centerY, Math.max(2, 0.4 * meterScale));
    draw3DQuad(centerX - paWidth / 2, top, paWidth, paDepth);
    draw3DQuad(centerX - paWidth / 2, bottom - paDepth, paWidth, paDepth);
    draw3DQuad(centerX - gaWidth / 2, top, gaWidth, gaDepth);
    draw3DQuad(centerX - gaWidth / 2, bottom - gaDepth, gaWidth, gaDepth);
    draw3DSpot(centerX, top + penaltySpotDist, Math.max(2, 0.3 * meterScale));
    draw3DSpot(
      centerX,
      bottom - penaltySpotDist,
      Math.max(2, 0.3 * meterScale),
    );
    draw3DArc(
      centerX,
      top + penaltySpotDist,
      r,
      Math.PI / 2 - arcAngle,
      Math.PI / 2 + arcAngle,
      24,
    );
    draw3DArc(
      centerX,
      bottom - penaltySpotDist,
      r,
      -Math.PI / 2 - arcAngle,
      -Math.PI / 2 + arcAngle,
      24,
    );
    draw3DArc(left, top, cornerArcRadius, 0, Math.PI / 2, 12);
    draw3DArc(right, top, cornerArcRadius, Math.PI / 2, Math.PI, 12);
    draw3DArc(left, bottom, cornerArcRadius, -Math.PI / 2, 0, 12);
    draw3DArc(right, bottom, cornerArcRadius, Math.PI, Math.PI * 1.5, 12);
  }
}
