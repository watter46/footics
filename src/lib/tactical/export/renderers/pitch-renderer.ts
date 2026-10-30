import { calculatePitchGeometryForAspect } from '@/lib/tactical/pitch-geometry';
import { calculatePitchTextureCover } from '@/lib/tactical/pitch-texture-geometry';
import type {
  AspectRatio,
  PitchAppearanceConfig,
} from '@/lib/types/tactical-unified';
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
  pitchAppearance?: PitchAppearanceConfig,
): void {
  const { ctx, w, m } = context;

  const geom = calculatePitchGeometryForAspect(aspectRatio);

  ctx.save();
  ctx.strokeStyle = pitchAppearance?.lineColor ?? '#e2b48d';
  ctx.fillStyle = 'none';
  const defaultLineWidth = Math.max(2, Math.round((w * 0.003) / 2) * 2);
  ctx.lineWidth = pitchAppearance?.lineWidth ?? defaultLineWidth;
  ctx.globalAlpha = pitchAppearance?.lineOpacity ?? 0.85;

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
  pitchAppearance?: PitchAppearanceConfig,
  marbleTexture?: CanvasImageSource | null,
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
    return;
  }

  const geom = calculatePitchGeometryForAspect(aspectRatio);
  const isMarble = pitchAppearance?.pitchBackgroundType === 'marble';

  if (isMarble) {
    // 1. Solid frame background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // 2. Pitch inner bounds calculation
    const toNormX = (svgX: number) => (svgX / geom.config.widthPx) * 100;
    const toNormY = (svgY: number) => (svgY / geom.config.heightPx) * 100;
    const toNormW = (svgW: number) => (svgW / geom.config.widthPx) * 100;
    const toNormH = (svgH: number) => (svgH / geom.config.heightPx) * 100;

    const normLeft = toNormX(geom.pitchLeft);
    const normTop = toNormY(geom.pitchTop);
    const normRight = toNormX(geom.pitchLeft + geom.pitchWidth);
    const normBottom = toNormY(geom.pitchTop + geom.pitchHeight);

    if (m) {
      // 3D Trapezoid clip
      ctx.save();
      const p0 = projectObjToScreen(normLeft, normTop);
      const p1 = projectObjToScreen(normRight, normTop);
      const p2 = projectObjToScreen(normRight, normBottom);
      const p3 = projectObjToScreen(normLeft, normBottom);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.clip();

      const minX = Math.min(p0.x, p1.x, p2.x, p3.x);
      const maxX = Math.max(p0.x, p1.x, p2.x, p3.x);
      const minY = Math.min(p0.y, p1.y, p2.y, p3.y);
      const maxY = Math.max(p0.y, p1.y, p2.y, p3.y);
      const bw = Math.max(1, maxX - minX);
      const bh = Math.max(1, maxY - minY);

      if (marbleTexture) {
        const tex = marbleTexture as {
          naturalWidth?: number;
          naturalHeight?: number;
          videoWidth?: number;
          videoHeight?: number;
          width?: number;
          height?: number;
        };
        const imgWidth = tex.naturalWidth ?? tex.videoWidth ?? tex.width ?? 679;
        const imgHeight =
          tex.naturalHeight ?? tex.videoHeight ?? tex.height ?? 800;

        const cover = calculatePitchTextureCover(
          { left: minX, top: minY, width: bw, height: bh },
          { width: imgWidth, height: imgHeight },
        );

        ctx.drawImage(
          marbleTexture,
          cover.x,
          cover.y,
          cover.width,
          cover.height,
        );
      }

      if (pitchAppearance && pitchAppearance.overlayOpacity > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = pitchAppearance.overlayOpacity;
        ctx.fillStyle = pitchAppearance.overlayColor;
        ctx.fillRect(minX, minY, bw, bh);
        ctx.restore();
      }

      ctx.restore();
    } else {
      const pitchBoundsPx = {
        left: snap(toScreenX(normLeft)),
        top: snap(toScreenY(normTop)),
        width: snap(toScreenSizeX(toNormW(geom.pitchWidth))),
        height: snap(toScreenSizeY(toNormH(geom.pitchHeight))),
      };

      // 3. Clip pitch inner area
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        pitchBoundsPx.left,
        pitchBoundsPx.top,
        pitchBoundsPx.width,
        pitchBoundsPx.height,
      );
      ctx.clip();

      // 4. Marble texture image cover
      if (marbleTexture) {
        const tex = marbleTexture as {
          naturalWidth?: number;
          naturalHeight?: number;
          videoWidth?: number;
          videoHeight?: number;
          width?: number;
          height?: number;
        };
        const imgWidth = tex.naturalWidth ?? tex.videoWidth ?? tex.width ?? 679;
        const imgHeight =
          tex.naturalHeight ?? tex.videoHeight ?? tex.height ?? 800;

        const cover = calculatePitchTextureCover(pitchBoundsPx, {
          width: imgWidth,
          height: imgHeight,
        });

        ctx.drawImage(
          marbleTexture,
          cover.x,
          cover.y,
          cover.width,
          cover.height,
        );
      }

      // 5. Overlay blend rectangle
      if (pitchAppearance && pitchAppearance.overlayOpacity > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = pitchAppearance.overlayOpacity;
        ctx.fillStyle = pitchAppearance.overlayColor;
        ctx.fillRect(
          pitchBoundsPx.left,
          pitchBoundsPx.top,
          pitchBoundsPx.width,
          pitchBoundsPx.height,
        );
        ctx.restore();
      }

      // Restore clip
      ctx.restore();
    }

    // 6. Pitch markings
    renderPitchMarkings(context, aspectRatio, pitchAppearance);
  } else {
    // Solid pitch background
    ctx.fillStyle = '#000000';
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
      ctx.fillStyle = '#000000';
      ctx.fill();
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(
        snap(toScreenX(0)),
        snap(toScreenY(0)),
        snap(toScreenSizeX(100)),
        snap(toScreenSizeY(100)),
      );
    }

    // Pitch markings
    renderPitchMarkings(context, aspectRatio, pitchAppearance);
  }
}
