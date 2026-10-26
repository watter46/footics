import { calculatePitchGeometryForAspect } from '@/lib/tactical/pitch-geometry';
import type { AspectRatio } from '@/lib/types/tactical-unified';
import { renderPitchMarkings2D } from './pitch-markings-2d';
import { renderPitchMarkings3D } from './pitch-markings-3d';
import type { FrameRenderContext } from './renderer-context';

export { renderPitchMarkings2D } from './pitch-markings-2d';
export { renderPitchMarkings3D } from './pitch-markings-3d';

/**
 * Draws pitch lines and markings for the given aspect ratio in 2D or 3D projected space.
 */
export function renderPitchMarkings(
  context: FrameRenderContext,
  aspectRatio: AspectRatio,
): void {
  const { ctx, w, m } = context;

  const geom = calculatePitchGeometryForAspect(aspectRatio);

  ctx.save();
  ctx.strokeStyle = '#e2b48d';
  ctx.fillStyle = 'none';
  const pitchLineWidth = Math.max(2, Math.round((w * 0.003) / 2) * 2);
  ctx.lineWidth = pitchLineWidth;
  ctx.globalAlpha = 0.85;

  if (m) {
    renderPitchMarkings3D(context, geom);
  } else {
    renderPitchMarkings2D(context, geom);
  }

  ctx.restore();
}

/**
 * Draws background and pitch markings onto canvas context.
 */
export function renderPitch(
  context: FrameRenderContext,
  aspectRatio: AspectRatio,
  transparent: boolean,
): void {
  const {
    ctx,
    w,
    h,
    m,
    toScreenX,
    toScreenY,
    toScreenSizeX,
    toScreenSizeY,
    projectObjToScreen,
    snap,
  } = context;

  if (transparent) {
    ctx.clearRect(0, 0, w, h);
  } else {
    // Solid pitch background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    // Pitch surface fill
    if (m) {
      const p0 = projectObjToScreen(0, 0);
      const p1 = projectObjToScreen(100, 0);
      const p2 = projectObjToScreen(100, 100);
      const p3 = projectObjToScreen(0, 100);
      ctx.beginPath();
      ctx.moveTo(snap(p0.x), snap(p0.y));
      ctx.lineTo(snap(p1.x), snap(p1.y));
      ctx.lineTo(snap(p2.x), snap(p2.y));
      ctx.lineTo(snap(p3.x), snap(p3.y));
      ctx.closePath();
      ctx.fillStyle = '#080e1e';
      ctx.fill();
    } else {
      ctx.fillStyle = '#080e1e';
      ctx.fillRect(
        snap(toScreenX(0)),
        snap(toScreenY(0)),
        snap(toScreenSizeX(100)),
        snap(toScreenSizeY(100)),
      );
    }

    // Pitch markings
    renderPitchMarkings(context, aspectRatio);
  }
}
