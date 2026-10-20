'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Image as KonvaImage, Layer, Rect } from 'react-konva';
import { calculatePitchRect } from '@/lib/tactical/pitch-geometry';
import {
  getCachedPitchSvgImage,
  loadPitchSvgImage,
  preloadAllPitchSvgImages,
} from '@/lib/tactical/pitch-svg';
import { useCanvasStore } from '../hooks/use-canvas-store';

export interface BackgroundImageLayerProps {
  width: number;
  height: number;
}

export function BackgroundImageLayer({
  width,
  height,
}: BackgroundImageLayerProps): ReactNode {
  const backgroundImageUrl = useCanvasStore((s) => s.backgroundImageUrl);
  const aspectRatio = useCanvasStore((s) => s.aspectRatio ?? '16:9');

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

  // backgroundImageUrl 未指定時のピッチSVGロード
  useEffect(() => {
    if (backgroundImageUrl) return;

    const cached = getCachedPitchSvgImage(aspectRatio);
    if (cached) {
      setPitchImage(cached);
      return;
    }

    let active = true;
    loadPitchSvgImage(aspectRatio)
      .then((img) => {
        if (active) {
          setPitchImage(img);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [backgroundImageUrl, aspectRatio]);

  const displayImage = backgroundImageUrl ? customImage : pitchImage;

  // Stage は常にコンテナ全面。ピッチのみ aspectRatio 通りの矩形で中央に contain 描画
  // (比率固定のため円は真円を保つ)。カスタム背景画像は従来どおり全面。
  const imageRect = backgroundImageUrl
    ? { x: 0, y: 0, width, height }
    : calculatePitchRect({ width, height }, aspectRatio);

  return (
    <Layer listening={false}>
      {/* ソリッド背景 */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#020617"
        listening={false}
      />
      {/* 余白0%（ゼロマージン）背景画像 / ピッチSVG */}
      {displayImage && (
        <KonvaImage
          image={displayImage}
          x={imageRect.x}
          y={imageRect.y}
          width={imageRect.width}
          height={imageRect.height}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </Layer>
  );
}
