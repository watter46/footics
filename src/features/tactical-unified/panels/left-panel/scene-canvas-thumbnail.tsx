'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import { renderTacticalPhaseFrameToCanvas } from '@/lib/tactical/export/tactical-phase-frame-renderer';
import { toMilliseconds } from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import {
  type BoundaryBox,
  getDefaultBoundaryBoxForAspect,
} from '@/lib/types/tactical/pitch-config';
import type {
  AspectRatio,
  PitchAppearanceConfig,
} from '@/lib/types/tactical-unified';

export interface SceneCanvasThumbnailProps {
  slide: DomainSlide;
  width?: number;
  height?: number;
  aspectRatio?: AspectRatio;
  boundaryBox?: BoundaryBox;
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
  boundaryBox: propBoundaryBox,
  pitchAppearance,
  className,
}: SceneCanvasThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dims = calculateDimensions(width, propHeight, aspectRatio);

  const phase: DomainTacticalPhase = useMemo(
    () => ({
      id: 'thumbnail-phase',
      name: 'Thumbnail',
      aspectRatio,
      boundaryBox:
        propBoundaryBox ?? getDefaultBoundaryBoxForAspect(aspectRatio),
      backgroundType: 'pitch',
      slides: [slide],
    }),
    [slide, aspectRatio, propBoundaryBox],
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
    renderTacticalPhaseFrameToCanvas({
      ctx,
      phase,
      timeMs: toMilliseconds(0),
      width: dims.width,
      height: dims.height,
      pitchAppearance,
      applyEffects: false,
    });
    ctx.restore();
  }, [phase, dims.width, dims.height, pitchAppearance]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label={`Thumbnail for ${slide.label || 'scene'}`}
    />
  );
});
