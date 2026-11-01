'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Shape } from 'react-konva';
import { renderPitch } from '@/lib/tactical/export/renderers/pitch-renderer';
import type { FrameRenderContext } from '@/lib/tactical/export/renderers/renderer-context';
import type {
  AspectRatio,
  PitchAppearanceConfig,
  PitchTransform,
} from '@/lib/types/tactical-unified';
import { buildExportMVPMatrix } from '../utils/canvas-pitch-transform-helper';

export interface Pitch3DBackgroundProps {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  pitchAppearance?: PitchAppearanceConfig;
  cameraTransform: PitchTransform;
}

const MARBLE_TEXTURE_SRC = '/assets/pitch-marble-texture.jpg';
let cachedMarbleImage: HTMLImageElement | null = null;

export function Pitch3DBackground({
  width,
  height,
  aspectRatio,
  pitchAppearance,
  cameraTransform,
}: Pitch3DBackgroundProps): React.JSX.Element {
  const [marbleImage, setMarbleImage] = useState<HTMLImageElement | null>(
    () => cachedMarbleImage,
  );

  useEffect(() => {
    if (pitchAppearance?.pitchBackgroundType !== 'marble') return;
    if (cachedMarbleImage) {
      setMarbleImage(cachedMarbleImage);
      return;
    }
    let active = true;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cachedMarbleImage = img;
      if (active) {
        setMarbleImage(img);
      }
    };
    img.src = MARBLE_TEXTURE_SRC;
    return () => {
      active = false;
    };
  }, [pitchAppearance?.pitchBackgroundType]);

  const m = useMemo(() => {
    if (width <= 0 || height <= 0) return null;
    return new Float32Array(
      buildExportMVPMatrix(cameraTransform, width, height, aspectRatio),
    );
  }, [cameraTransform, width, height, aspectRatio]);

  return (
    <Shape
      sceneFunc={(context) => {
        if (!m || width <= 0 || height <= 0) return;
        const rawCtx = context._context as CanvasRenderingContext2D | undefined;
        if (!rawCtx || typeof rawCtx.beginPath !== 'function') return;

        const toScreenX = (normX: number) => (normX / 100) * width;
        const toScreenY = (normY: number) => (normY / 100) * height;
        const toScreenSizeX = (normSize: number) => (normSize / 100) * width;
        const toScreenSizeY = (normSize: number) => (normSize / 100) * height;

        const projectObjToScreen = (norm100X: number, norm100Y: number) => {
          const normX = norm100X / 100;
          const normY = norm100Y / 100;
          const modelX = normX - 0.5;
          const modelY = 0.5 - normY;
          const clipX = modelX * m[0] + modelY * m[4] + m[12];
          const clipY = modelX * m[1] + modelY * m[5] + m[13];
          const clipW = modelX * m[3] + modelY * m[7] + m[15];
          if (Math.abs(clipW) < 1e-6) return { x: 0, y: 0 };
          const ndcX = clipX / clipW;
          const ndcY = clipY / clipW;
          return {
            x: (ndcX + 1) * 0.5 * width,
            y: (1 - ndcY) * 0.5 * height,
          };
        };

        const frameContext: FrameRenderContext = {
          ctx: rawCtx,
          w: width,
          h: height,
          m,
          toScreenX,
          toScreenY,
          toScreenSizeX,
          toScreenSizeY,
          projectObjToScreen,
          snap: (v: number) => v,
        };

        rawCtx.save();
        renderPitch(
          frameContext,
          aspectRatio,
          false,
          pitchAppearance,
          marbleImage,
        );
        rawCtx.restore();
      }}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}
