'use client';

/**
 * pitch-background.tsx
 * Unified canvas — ピッチ背景
 * 4種のアスペクト比 (16:9, 9:16, 4:5, 1:1) に完全対応し、
 * 余白3%でセンターサークルが歪みのない厳密真円を維持するSVGを描画。
 */

import { Group, Image as KonvaImage, Rect } from 'react-konva';
import {
  calculatePitchGeometryForAspect,
  DEFAULT_PITCH_MARGIN_PERCENT,
} from '@/lib/tactical/pitch-geometry';
import { usePitchImage } from '../hooks/use-pitch-image';
import type { PitchBackgroundProps } from '../types';

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
  const { pitchImg, bgImg } = usePitchImage({
    aspectRatio,
    marginPercent,
    grass,
    backgroundType,
    backgroundImageUrl,
  });

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
