import {
  calculatePitchRect,
  type PitchBoundaryConfig,
  type PitchLayoutGeometry,
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

  const outerRect =
    context.outerPitchRect ??
    calculatePitchRect(
      { width: context.w, height: context.h },
      geom.config.orientation === 'horizontal' ? '16:9' : '4:5',
    );

  const toNormX = (svgX: number) => (svgX / config.widthPx) * 100;
  const toNormY = (svgY: number) => (svgY / config.heightPx) * 100;

  const projectPitch = (vx: number, vy: number) => {
    if (context.m) {
      return projectObjToScreen(toNormX(vx), toNormY(vy));
    }
    return {
      x: outerRect.x + (toNormX(vx) / 100) * outerRect.width,
      y: outerRect.y + (toNormY(vy) / 100) * outerRect.height,
    };
  };

  const draw3DLine = (x1: number, y1: number, x2: number, y2: number) => {
    if (context.project3DSegment) {
      const seg = context.project3DSegment(
        toNormX(x1),
        toNormY(y1),
        toNormX(x2),
        toNormY(y2),
      );
      if (!seg) return;
      ctx.beginPath();
      ctx.moveTo(snap(seg[0].x), snap(seg[0].y));
      ctx.lineTo(snap(seg[1].x), snap(seg[1].y));
      ctx.stroke();
      return;
    }
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
    if (context.project3DSegment) {
      if (stroke) {
        draw3DLine(qx, qy, qx + qw, qy);
        draw3DLine(qx + qw, qy, qx + qw, qy + qh);
        draw3DLine(qx + qw, qy + qh, qx, qy + qh);
        draw3DLine(qx, qy + qh, qx, qy);
      }
      return;
    }
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
    segments = 64,
  ) => {
    if (context.project3DSegment) {
      const angleSpan = endAngle - startAngle;
      let prevPx = cx + Math.cos(startAngle) * radius;
      let prevPy = cy + Math.sin(startAngle) * radius;
      for (let i = 1; i <= segments; i++) {
        const angle = startAngle + (angleSpan * i) / segments;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        draw3DLine(prevPx, prevPy, px, py);
        prevPx = px;
        prevPy = py;
      }
      return;
    }
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
    if (context.project3DSegment) {
      const testSeg = context.project3DSegment(
        toNormX(cx),
        toNormY(cy),
        toNormX(cx),
        toNormY(cy),
      );
      if (!testSeg) return;
    }
    ctx.save();
    ctx.fillStyle = '#e2b48d';
    ctx.beginPath();
    const segments = 24;
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
    draw3DArc(centerX, centerY, r, 0, Math.PI * 2, 72);
    draw3DSpot(centerX, centerY, Math.max(2, 0.4 * meterScale));
    draw3DQuad(left, centerY - paWidth / 2, paDepth, paWidth);
    draw3DQuad(right - paDepth, centerY - paWidth / 2, paDepth, paWidth);
    draw3DQuad(left, centerY - gaWidth / 2, gaDepth, gaWidth);
    draw3DQuad(right - gaDepth, centerY - gaWidth / 2, gaDepth, gaWidth);
    draw3DSpot(left + penaltySpotDist, centerY, Math.max(2, 0.3 * meterScale));
    draw3DSpot(right - penaltySpotDist, centerY, Math.max(2, 0.3 * meterScale));
    draw3DArc(left + penaltySpotDist, centerY, r, -arcAngle, arcAngle, 36);
    draw3DArc(
      right - penaltySpotDist,
      centerY,
      r,
      Math.PI - arcAngle,
      Math.PI + arcAngle,
      36,
    );
    draw3DArc(left, top, cornerArcRadius, 0, Math.PI / 2, 16);
    draw3DArc(right, top, cornerArcRadius, Math.PI / 2, Math.PI, 16);
    draw3DArc(left, bottom, cornerArcRadius, -Math.PI / 2, 0, 16);
    draw3DArc(right, bottom, cornerArcRadius, Math.PI, Math.PI * 1.5, 16);
  } else {
    draw3DLine(left, centerY, right, centerY);
    draw3DArc(centerX, centerY, r, 0, Math.PI * 2, 72);
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
      36,
    );
    draw3DArc(
      centerX,
      bottom - penaltySpotDist,
      r,
      -Math.PI / 2 - arcAngle,
      -Math.PI / 2 + arcAngle,
      36,
    );
    draw3DArc(left, top, cornerArcRadius, 0, Math.PI / 2, 16);
    draw3DArc(right, top, cornerArcRadius, Math.PI / 2, Math.PI, 16);
    draw3DArc(left, bottom, cornerArcRadius, -Math.PI / 2, 0, 16);
    draw3DArc(right, bottom, cornerArcRadius, Math.PI, Math.PI * 1.5, 16);
  }
}
