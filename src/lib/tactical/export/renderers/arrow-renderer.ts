import {
  applyDotOffsets,
  computeArrowDimensions,
} from '@/features/tactical-unified/core/components/annotations/arrow-geometry';
import {
  getQuadraticBezierPoints,
  getWavyPoints,
} from '@/features/tactical-unified/core/components/annotations/wavy-arrow-math';
import {
  computeArrowEffectState,
  trimRenderPoints,
} from '@/lib/tactical/effect-geometry';
import type {
  InterpolatedArrowState,
  InterpolatedPlayerState,
} from '@/lib/tactical/unified-interpolation';
import type { ArrowEffectConfig } from '@/lib/types/tactical/annotations';
import { renderConnectLines } from './connect-line-renderer';
import type { FrameRenderContext } from './renderer-context';

export { renderConnectLines };

/**
 * Draws tactical arrows onto canvas context.
 */
export function renderArrows(
  context: FrameRenderContext,
  arrows: Record<string, InterpolatedArrowState>,
  players?: Record<string, InterpolatedPlayerState>,
): void {
  const { ctx, w, projectObjToScreen, snap } = context;

  Object.values(arrows).forEach((a) => {
    if (!a.visible || a.points.length < 2) return;
    ctx.save();
    const arrowColor = a.color || '#38bdf8';
    ctx.strokeStyle = arrowColor;
    ctx.fillStyle = arrowColor;
    const dims = computeArrowDimensions(w, a.strokeWidth);
    const scale = dims.scale;
    const arrowWidth = dims.strokeWidth;
    const pointerLength = dims.pointerLength;
    const pointerWidth = dims.pointerWidth;
    const dotRadius = dims.dotRadius;

    ctx.lineWidth = arrowWidth;
    ctx.globalAlpha = a.opacity ?? 1;

    const _sa = projectObjToScreen(a.points[0].x, a.points[0].y);
    let sx = snap(_sa.x);
    let sy = snap(_sa.y);
    const _ea = projectObjToScreen(a.points[1].x, a.points[1].y);
    let ex = snap(_ea.x);
    let ey = snap(_ea.y);

    const isWavy =
      a.arrowType === 'dribble' || (a.arrowType as string) === 'arrow_wavy';
    const isCurved =
      !isWavy &&
      (a.curveType === 'curved' ||
        a.curveType === 'arc' ||
        a.controlPoint !== undefined) &&
      a.controlPoint !== undefined;
    const isDotEnd = a.arrowType === 'route_line' || a.endMarker === 'dot';
    const hasArrowHead =
      a.arrowHead !== false &&
      a.endMarker !== 'none' &&
      a.arrowType !== 'line' &&
      !isDotEnd;

    // 接続選手の境界オフセット
    const sourcePlayer =
      a.sourcePlayerId && players ? players[a.sourcePlayerId] : undefined;
    const targetPlayer =
      a.targetPlayerId && players ? players[a.targetPlayerId] : undefined;

    let cx = 0;
    let cy = 0;
    if (isCurved && a.controlPoint) {
      const _ca = projectObjToScreen(a.controlPoint.x, a.controlPoint.y);
      cx = snap(_ca.x);
      cy = snap(_ca.y);
    }

    if (sourcePlayer?.visible) {
      const sourceRadius =
        ((sourcePlayer as { size?: number }).size || 18) * scale + 2;
      const angle =
        isCurved && a.controlPoint
          ? Math.atan2(cy - sy, cx - sx)
          : Math.atan2(ey - sy, ex - sx);
      sx = snap(sx + sourceRadius * Math.cos(angle));
      sy = snap(sy + sourceRadius * Math.sin(angle));
    }

    if (targetPlayer?.visible) {
      const targetRadius =
        ((targetPlayer as { size?: number }).size || 18) * scale + 2;
      const angle =
        isCurved && a.controlPoint
          ? Math.atan2(ey - cy, ex - cx)
          : Math.atan2(ey - sy, ex - sx);
      ex = snap(ex - targetRadius * Math.cos(angle));
      ey = snap(ey - targetRadius * Math.sin(angle));
    }

    const {
      rsx: lineSx,
      rsy: lineSy,
      rex: lineEx,
      rey: lineEy,
    } = applyDotOffsets(
      sx,
      sy,
      ex,
      ey,
      isCurved && a.controlPoint ? cx : undefined,
      isCurved && a.controlPoint ? cy : undefined,
      isCurved,
      isWavy,
      isDotEnd,
      dotRadius,
    );

    const dash = Array.isArray(a.dashArray)
      ? a.dashArray.map((d) => d * scale)
      : a.arrowType === 'pass' || a.arrowType === 'defend'
        ? [8 * scale, 5 * scale]
        : [];
    ctx.setLineDash(dash);

    let effectiveDashOffset = a.dashOffset;
    const arrowWithEffect = a as { effect?: ArrowEffectConfig };
    if (
      effectiveDashOffset === undefined &&
      arrowWithEffect.effect &&
      context.timeInSlideMs !== undefined
    ) {
      const effectState = computeArrowEffectState(
        context.timeInSlideMs,
        arrowWithEffect.effect,
      );
      effectiveDashOffset = effectState.dashOffset;
    }

    if (effectiveDashOffset !== undefined) {
      ctx.lineDashOffset = effectiveDashOffset;
    }

    let headEx = lineEx;
    let headEy = lineEy;
    let headAngle =
      isCurved && a.controlPoint
        ? Math.atan2(
            ey - snap(projectObjToScreen(a.controlPoint.x, a.controlPoint.y).y),
            ex - snap(projectObjToScreen(a.controlPoint.x, a.controlPoint.y).x),
          )
        : Math.atan2(ey - sy, ex - sx);

    ctx.beginPath();
    if (a.progress !== undefined) {
      const clampedProgress = Math.max(0, Math.min(1, a.progress));
      let ptsList: { x: number; y: number }[];
      if (isWavy) {
        const wavyPts = getWavyPoints(lineSx, lineSy, lineEx, lineEy);
        ptsList = [];
        for (let i = 0; i < wavyPts.length; i += 2) {
          ptsList.push({ x: wavyPts[i], y: wavyPts[i + 1] });
        }
      } else if (isCurved && a.controlPoint) {
        const bezierPts = getQuadraticBezierPoints(
          lineSx,
          lineSy,
          cx,
          cy,
          lineEx,
          lineEy,
        );
        ptsList = [];
        for (let i = 0; i < bezierPts.length; i += 2) {
          ptsList.push({ x: bezierPts[i], y: bezierPts[i + 1] });
        }
      } else {
        ptsList = [
          { x: lineSx, y: lineSy },
          { x: lineEx, y: lineEy },
        ];
      }

      const { trimmedPoints, tipAngle } = trimRenderPoints(
        ptsList,
        clampedProgress,
        isWavy,
      );
      if (trimmedPoints.length >= 2) {
        ctx.moveTo(trimmedPoints[0].x, trimmedPoints[0].y);
        for (let i = 1; i < trimmedPoints.length; i++) {
          ctx.lineTo(trimmedPoints[i].x, trimmedPoints[i].y);
        }
      }
      ctx.stroke();

      const lastPt = trimmedPoints[trimmedPoints.length - 1];
      if (lastPt) {
        headEx = lastPt.x;
        headEy = lastPt.y;
      }
      headAngle = a.tipAngle !== undefined ? a.tipAngle : tipAngle;
    } else {
      if (isWavy) {
        const wavyPts = getWavyPoints(lineSx, lineSy, lineEx, lineEy);
        if (wavyPts.length >= 2) {
          ctx.moveTo(wavyPts[0], wavyPts[1]);
          for (let i = 2; i < wavyPts.length; i += 2) {
            ctx.lineTo(wavyPts[i], wavyPts[i + 1]);
          }
        }
        ctx.stroke();
      } else if (isCurved && a.controlPoint) {
        ctx.moveTo(lineSx, lineSy);
        ctx.quadraticCurveTo(cx, cy, lineEx, lineEy);
        ctx.stroke();
      } else {
        ctx.moveTo(lineSx, lineSy);
        ctx.lineTo(lineEx, lineEy);
        ctx.stroke();
      }
    }

    // Arrowhead or Dot endpoint
    ctx.setLineDash([]);
    if (isDotEnd) {
      ctx.lineWidth = Math.max(2 * scale, arrowWidth);
      ctx.beginPath();
      ctx.arc(sx, sy, dotRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(headEx, headEy, dotRadius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (hasArrowHead) {
      const cos = Math.cos(headAngle);
      const sin = Math.sin(headAngle);
      const bx = headEx - pointerLength * cos;
      const by = headEy - pointerLength * sin;
      const halfWidth = pointerWidth / 2;

      ctx.beginPath();
      ctx.moveTo(headEx, headEy);
      ctx.lineTo(bx - halfWidth * sin, by + halfWidth * cos);
      ctx.lineTo(bx + halfWidth * sin, by - halfWidth * cos);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  });
}
