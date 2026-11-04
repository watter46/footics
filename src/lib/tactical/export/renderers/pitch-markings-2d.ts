import { calculatePitchRect } from '@/lib/tactical/pitch-geometry';
import type { PitchGeometryData } from './pitch-markings-3d';
import type { FrameRenderContext } from './renderer-context';

/**
 * Renders 2D flat pitch markings.
 */
export function renderPitchMarkings2D(
  context: FrameRenderContext,
  geom: PitchGeometryData,
): void {
  const { ctx, w, toScreenX, toScreenY, toScreenSizeX, toScreenSizeY, snap } =
    context;

  const {
    pitchLeft,
    pitchTop,
    pitchWidth,
    pitchHeight,
    centerX,
    centerY,
    centerCircleRadius,
    paDepth,
    paWidth,
    gaDepth,
    gaWidth,
    penaltySpotDist,
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
      { width: w, height: context.h },
      geom.config.orientation === 'horizontal' ? '16:9' : '4:5',
    );

  const toNormX = (svgX: number) =>
    ((outerRect.x + (svgX / config.widthPx) * outerRect.width) / w) * 100;
  const toNormY = (svgY: number) =>
    ((outerRect.y + (svgY / config.heightPx) * outerRect.height) / context.h) *
    100;
  const toNormW = (svgW: number) =>
    (((svgW / config.widthPx) * outerRect.width) / w) * 100;
  const toNormH = (svgH: number) =>
    (((svgH / config.heightPx) * outerRect.height) / context.h) * 100;

  ctx.strokeRect(
    snap(toScreenX(toNormX(left))),
    snap(toScreenY(toNormY(top))),
    snap(toScreenSizeX(toNormW(pitchWidth))),
    snap(toScreenSizeY(toNormH(pitchHeight))),
  );

  if (isHorizontal) {
    ctx.beginPath();
    ctx.moveTo(
      snap(toScreenX(toNormX(centerX))),
      snap(toScreenY(toNormY(top))),
    );
    ctx.lineTo(
      snap(toScreenX(toNormX(centerX))),
      snap(toScreenY(toNormY(bottom))),
    );
    ctx.stroke();

    const cx = toScreenX(toNormX(centerX));
    const cy = toScreenY(toNormY(centerY));
    const rX = toScreenSizeX(toNormW(r));
    const rY = toScreenSizeY(toNormH(r));
    ctx.beginPath();
    ctx.ellipse(snap(cx), snap(cy), snap(rX), snap(rY), 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(
      snap(cx),
      snap(cy),
      Math.max(2, Math.round(w * 0.003)),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = '#e2b48d';
    ctx.fill();
    ctx.fillStyle = 'none';

    ctx.strokeRect(
      snap(toScreenX(toNormX(left))),
      snap(toScreenY(toNormY(centerY - paWidth / 2))),
      snap(toScreenSizeX(toNormW(paDepth))),
      snap(toScreenSizeY(toNormH(paWidth))),
    );
    ctx.strokeRect(
      snap(toScreenX(toNormX(right - paDepth))),
      snap(toScreenY(toNormY(centerY - paWidth / 2))),
      snap(toScreenSizeX(toNormW(paDepth))),
      snap(toScreenSizeY(toNormH(paWidth))),
    );
    ctx.strokeRect(
      snap(toScreenX(toNormX(left))),
      snap(toScreenY(toNormY(centerY - gaWidth / 2))),
      snap(toScreenSizeX(toNormW(gaDepth))),
      snap(toScreenSizeY(toNormH(gaWidth))),
    );
    ctx.strokeRect(
      snap(toScreenX(toNormX(right - gaDepth))),
      snap(toScreenY(toNormY(centerY - gaWidth / 2))),
      snap(toScreenSizeX(toNormW(gaDepth))),
      snap(toScreenSizeY(toNormH(gaWidth))),
    );
    ctx.beginPath();
    ctx.arc(
      snap(toScreenX(toNormX(left + penaltySpotDist))),
      snap(toScreenY(toNormY(centerY))),
      Math.max(2, Math.round(w * 0.003)),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = '#e2b48d';
    ctx.fill();
    ctx.fillStyle = 'none';

    ctx.beginPath();
    ctx.ellipse(
      snap(toScreenX(toNormX(left + penaltySpotDist))),
      snap(toScreenY(toNormY(centerY))),
      snap(rX),
      snap(rY),
      0,
      -arcAngle,
      arcAngle,
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(
      snap(toScreenX(toNormX(right - penaltySpotDist))),
      snap(toScreenY(toNormY(centerY))),
      Math.max(2, Math.round(w * 0.003)),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = '#e2b48d';
    ctx.fill();
    ctx.fillStyle = 'none';

    ctx.beginPath();
    ctx.ellipse(
      snap(toScreenX(toNormX(right - penaltySpotDist))),
      snap(toScreenY(toNormY(centerY))),
      snap(rX),
      snap(rY),
      0,
      Math.PI - arcAngle,
      Math.PI + arcAngle,
    );
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(
      snap(toScreenX(toNormX(left))),
      snap(toScreenY(toNormY(centerY))),
    );
    ctx.lineTo(
      snap(toScreenX(toNormX(right))),
      snap(toScreenY(toNormY(centerY))),
    );
    ctx.stroke();

    const cx = toScreenX(toNormX(centerX));
    const cy = toScreenY(toNormY(centerY));
    const rX = toScreenSizeX(toNormW(r));
    const rY = toScreenSizeY(toNormH(r));
    ctx.beginPath();
    ctx.ellipse(snap(cx), snap(cy), snap(rX), snap(rY), 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(
      snap(cx),
      snap(cy),
      Math.max(2, Math.round(w * 0.005)),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = '#e2b48d';
    ctx.fill();
    ctx.fillStyle = 'none';

    ctx.strokeRect(
      snap(toScreenX(toNormX(centerX - paWidth / 2))),
      snap(toScreenY(toNormY(top))),
      snap(toScreenSizeX(toNormW(paWidth))),
      snap(toScreenSizeY(toNormH(paDepth))),
    );
    ctx.strokeRect(
      snap(toScreenX(toNormX(centerX - paWidth / 2))),
      snap(toScreenY(toNormY(bottom - paDepth))),
      snap(toScreenSizeX(toNormW(paWidth))),
      snap(toScreenSizeY(toNormH(paDepth))),
    );
    ctx.strokeRect(
      snap(toScreenX(toNormX(centerX - gaWidth / 2))),
      snap(toScreenY(toNormY(top))),
      snap(toScreenSizeX(toNormW(gaWidth))),
      snap(toScreenSizeY(toNormH(gaDepth))),
    );
    ctx.strokeRect(
      snap(toScreenX(toNormX(centerX - gaWidth / 2))),
      snap(toScreenY(toNormY(bottom - gaDepth))),
      snap(toScreenSizeX(toNormW(gaWidth))),
      snap(toScreenSizeY(toNormH(gaDepth))),
    );
    ctx.beginPath();
    ctx.arc(
      snap(toScreenX(toNormX(centerX))),
      snap(toScreenY(toNormY(top + penaltySpotDist))),
      Math.max(2, Math.round(w * 0.004)),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = '#e2b48d';
    ctx.fill();
    ctx.fillStyle = 'none';

    ctx.beginPath();
    ctx.ellipse(
      snap(toScreenX(toNormX(centerX))),
      snap(toScreenY(toNormY(top + penaltySpotDist))),
      snap(rX),
      snap(rY),
      0,
      Math.PI / 2 - arcAngle,
      Math.PI / 2 + arcAngle,
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(
      snap(toScreenX(toNormX(centerX))),
      snap(toScreenY(toNormY(bottom - penaltySpotDist))),
      Math.max(2, Math.round(w * 0.004)),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = '#e2b48d';
    ctx.fill();
    ctx.fillStyle = 'none';

    ctx.beginPath();
    ctx.ellipse(
      snap(toScreenX(toNormX(centerX))),
      snap(toScreenY(toNormY(bottom - penaltySpotDist))),
      snap(rX),
      snap(rY),
      0,
      -Math.PI / 2 - arcAngle,
      -Math.PI / 2 + arcAngle,
    );
    ctx.stroke();
  }
}
