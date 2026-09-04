'use client';

/**
 * pitch-background.tsx
 * Unified canvas — ピッチ背景
 * 4種のアスペクト比 (16:9, 9:16, 4:5, 1:1) に完全対応し、
 * 余白3%でセンターサークルが歪みのない厳密真円を維持するSVGを描画。
 */

import { useEffect, useState } from 'react';
import { Group, Image as KonvaImage, Rect } from 'react-konva';
import {
  calculatePitchGeometryForAspect,
  DEFAULT_PITCH_MARGIN_PERCENT,
} from '@/lib/tactical/pitch-geometry';
import {
  getCachedPitchSvgImage,
  loadPitchSvgImage,
  preloadAllPitchSvgImages,
} from '@/lib/tactical/pitch-svg';
import type { AspectRatio } from '@/lib/types/tactical-unified';

export interface PitchBackgroundProps {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  /** 背景画像URL (スクショバインド等) */
  backgroundImageUrl?: string;
  backgroundType?: 'pitch' | 'image' | 'blank';
  marginPercent?: number;
  grass?: boolean;
  draggable?: boolean;
  onDragEnd?: (pos: { x: number; y: number }) => void;
}

export function PitchBackground({
  width,
  height,
  aspectRatio,
  backgroundImageUrl,
  backgroundType = 'pitch',
  marginPercent = DEFAULT_PITCH_MARGIN_PERCENT,
  grass = true,
  draggable = false,
  onDragEnd,
}: PitchBackgroundProps) {
  // 初期化時にキャッシュがあれば即時適用（アスペクト比切替時のチラつき・引き伸ばし防止）
  const [pitchImg, setPitchImg] = useState<HTMLImageElement | null>(() => {
    if (typeof window === 'undefined') return null;
    return getCachedPitchSvgImage(aspectRatio, { marginPercent, grass });
  });
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);

  // マウント時に全アスペクト比のピッチSVG画像を先行ロード
  useEffect(() => {
    preloadAllPitchSvgImages();
  }, []);

  // ピッチSVG ロード（キャッシュ優先で即時同期）
  useEffect(() => {
    if (backgroundType !== 'pitch') return;

    const cached = getCachedPitchSvgImage(aspectRatio, {
      marginPercent,
      grass,
    });
    if (cached) {
      setPitchImg(cached);
      return;
    }

    let cancelled = false;
    loadPitchSvgImage(aspectRatio, { marginPercent, grass })
      .then((img) => {
        if (!cancelled) setPitchImg(img);
      })
      .catch((err) => {
        console.error('Failed to load pitch SVG image:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [aspectRatio, backgroundType, marginPercent, grass]);

  // 背景画像ロード (スクショバインド)
  useEffect(() => {
    if (backgroundType !== 'image' || !backgroundImageUrl) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setBgImg(img);
    img.src = backgroundImageUrl;
  }, [backgroundImageUrl, backgroundType]);

  return (
    <>
      {/* ソリッド黒背景 */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#020617"
        listening={false}
      />

      {/* ピッチ or 背景画像 (画像背景は境界線ポインタ用 2% 余白内に配置) */}
      <Group
        draggable={draggable}
        onDragEnd={(e) => {
          if (!onDragEnd) return;
          const node = e.target;
          onDragEnd({ x: node.x(), y: node.y() });
        }}
      >
        {backgroundType === 'pitch' && pitchImg && (
          <KonvaImage
            image={pitchImg}
            x={0}
            y={0}
            width={width}
            height={height}
            listening={draggable}
            perfectDrawEnabled={false}
          />
        )}
        {backgroundType === 'image' && bgImg && (
          <KonvaImage
            image={bgImg}
            x={width * 0.02}
            y={height * 0.02}
            width={width * 0.96}
            height={height * 0.96}
            listening={draggable}
            perfectDrawEnabled={false}
          />
        )}
      </Group>
    </>
  );
}
export { calculatePitchGeometryForAspect, DEFAULT_PITCH_MARGIN_PERCENT };
