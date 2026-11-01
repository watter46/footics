'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Image as KonvaImage, Layer, Rect } from 'react-konva';
import {
  getCachedPitchSvgImage,
  loadPitchSvgImage,
  preloadAllPitchSvgImages,
} from '@/lib/tactical/pitch-svg';
import { DEFAULT_PITCH_APPEARANCE } from '@/lib/types/tactical-unified';
import { useCanvasStore } from '../hooks/use-canvas-store';
import { hasActiveCameraTransform } from '../utils/preview-scene-projector';
import { Pitch3DBackground } from './pitch-3d-background';
import { PitchMarbleBackground } from './pitch-marble-background';

export interface PitchBackgroundImageProps {
  width: number;
  height: number;
}

export function PitchBackgroundImage({
  width,
  height,
}: PitchBackgroundImageProps): ReactNode {
  const backgroundImageUrl = useCanvasStore((s) => s.backgroundImageUrl);
  const cameraTransform = useCanvasStore((s) => s.cameraTransform);
  const aspectRatio = useCanvasStore((s) => s.aspectRatio ?? '16:9');
  const pitchAppearance = useCanvasStore(
    (s) => s.pitchAppearance ?? DEFAULT_PITCH_APPEARANCE,
  );

  const [customImage, setCustomImage] = useState<HTMLImageElement | null>(null);
  const [pitchImage, setPitchImage] = useState<HTMLImageElement | null>(() => {
    if (typeof window === 'undefined') return null;
    return getCachedPitchSvgImage(aspectRatio);
  });

  // 全アスペクト比の事前プリロード（Flicker-free）
  useEffect(() => {
    preloadAllPitchSvgImages();
  }, []);

  // backgroundImageUrl 指定時の画像ロード
  useEffect(() => {
    if (!backgroundImageUrl) {
      setCustomImage(null);
      return;
    }
    let active = true;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (active) {
        setCustomImage(img);
      }
    };
    img.src = backgroundImageUrl;
    return () => {
      active = false;
    };
  }, [backgroundImageUrl]);

  // solid ピッチSVGロード
  useEffect(() => {
    if (backgroundImageUrl) return;
    if (pitchAppearance.pitchBackgroundType === 'marble') return;

    const options = {
      strokeColor: pitchAppearance.lineColor,
      strokeWidth: pitchAppearance.lineWidth,
      strokeOpacity: pitchAppearance.lineOpacity,
    };
    const cached = getCachedPitchSvgImage(aspectRatio, options);
    if (cached) {
      setPitchImage(cached);
      return;
    }

    let active = true;
    loadPitchSvgImage(aspectRatio, options)
      .then((img) => {
        if (active) {
          setPitchImage(img);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [backgroundImageUrl, aspectRatio, pitchAppearance]);

  // 1. カスタム画像背景
  if (backgroundImageUrl && customImage) {
    return (
      <KonvaImage
        image={customImage}
        x={0}
        y={0}
        width={width}
        height={height}
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  }

  // 2. 3D カメラ背景
  if (
    !backgroundImageUrl &&
    cameraTransform &&
    hasActiveCameraTransform(cameraTransform)
  ) {
    return (
      <Pitch3DBackground
        width={width}
        height={height}
        aspectRatio={aspectRatio}
        pitchAppearance={pitchAppearance}
        cameraTransform={cameraTransform}
      />
    );
  }

  // 3. 大理石背景
  if (pitchAppearance.pitchBackgroundType === 'marble') {
    return (
      <PitchMarbleBackground
        width={width}
        height={height}
        aspectRatio={aspectRatio}
        pitchAppearance={pitchAppearance}
      />
    );
  }

  // 4. 通常ピッチ（Solid）
  if (pitchImage) {
    return (
      <KonvaImage
        image={pitchImage}
        x={0}
        y={0}
        width={width}
        height={height}
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  }

  return null;
}

export interface BackgroundImageLayerProps {
  width: number;
  height: number;
}

export function BackgroundImageLayer({
  width,
  height,
}: BackgroundImageLayerProps): ReactNode {
  return (
    <Layer listening={false}>
      {/* ソリッド背景 */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#000000"
        listening={false}
      />
      {/* 余白0%（ゼロマージン）背景画像 / ピッチSVG */}
      <PitchBackgroundImage width={width} height={height} />
    </Layer>
  );
}
