'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Image as KonvaImage, Layer, Rect } from 'react-konva';
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
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!backgroundImageUrl) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
    };
    img.src = backgroundImageUrl;
  }, [backgroundImageUrl]);

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
      {/* 余白0%（ゼロマージン）背景画像 */}
      {image && (
        <KonvaImage
          image={image}
          x={0}
          y={0}
          width={width}
          height={height}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </Layer>
  );
}
