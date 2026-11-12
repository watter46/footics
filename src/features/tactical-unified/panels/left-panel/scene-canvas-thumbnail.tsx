'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import { normalizePhases } from '@/lib/tactical/acl/slide-normalizer';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import type {
  AspectRatio,
  PitchAppearanceConfig,
  Slide,
} from '@/lib/types/tactical-unified';

export interface SceneCanvasThumbnailProps {
  slide: Slide;
  width?: number;
  height?: number;
  aspectRatio?: AspectRatio;
  pitchAppearance?: PitchAppearanceConfig;
  className?: string;
}

function calculateDimensions(
  width = 120,
  height?: number,
  aspectRatio: AspectRatio = '16:9',
): { width: number; height: number } {
  if (height !== undefined) {
    return { width, height };
  }
  let ratio = 9 / 16;
  if (aspectRatio === '9:16') {
    ratio = 16 / 9;
  } else if (aspectRatio === '4:5') {
    ratio = 5 / 4;
  } else if (aspectRatio === '1:1') {
    ratio = 1;
  }
  return { width, height: Math.round(width * ratio) };
}

export const SceneCanvasThumbnail = memo(function SceneCanvasThumbnail({
  slide,
  width = 120,
  height: propHeight,
  aspectRatio = '16:9',
  pitchAppearance,
  className,
}: SceneCanvasThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dims = calculateDimensions(width, propHeight, aspectRatio);

  const phase = useMemo(
    () =>
      normalizePhases({
        slides: [slide],
        aspectRatio,
        boundaryBox: slide.boundaryBox,
      })[0],
    [slide, aspectRatio],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.round(dims.width * dpr);
    canvas.height = Math.round(dims.height * dpr);
    canvas.style.width = `${dims.width}px`;
    canvas.style.height = `${dims.height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    renderTacticalFrameToCanvas(ctx, {
      slides: [slide],
      phase,
      timeMs: 0,
      width: dims.width,
      height: dims.height,
      aspectRatio,
      boundaryBox: slide.boundaryBox,
      pitchAppearance,
      applyEffects: false,
    });
    ctx.restore();
  }, [slide, phase, dims.width, dims.height, aspectRatio, pitchAppearance]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label={`Thumbnail for ${slide.label || 'scene'}`}
    />
  );
});
