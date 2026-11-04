'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Group, Image as KonvaImage, Rect } from 'react-konva';
import {
  calculatePitchGeometryForAspect,
  calculatePitchRect,
} from '@/lib/tactical/pitch-geometry';
import {
  getCachedPitchSvgImage,
  loadPitchSvgImage,
} from '@/lib/tactical/pitch-svg';
import { calculatePitchTextureCover } from '@/lib/tactical/pitch-texture-geometry';
import type {
  AspectRatio,
  PitchAppearanceConfig,
} from '@/lib/types/tactical-unified';

export interface PitchMarbleBackgroundProps {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  pitchAppearance: PitchAppearanceConfig;
  subPitchRect?: { x: number; y: number; width: number; height: number };
}

const MARBLE_TEXTURE_SRC = '/assets/pitch-marble-texture.jpg';
let cachedMarbleImage: HTMLImageElement | null = null;

export function PitchMarbleBackground({
  width,
  height,
  aspectRatio,
  pitchAppearance,
  subPitchRect,
}: PitchMarbleBackgroundProps): ReactNode {
  const [marbleImage, setMarbleImage] = useState<HTMLImageElement | null>(
    () => cachedMarbleImage,
  );
  const [markingImage, setMarkingImage] = useState<HTMLImageElement | null>(
    null,
  );

  // 大理石画像のロード & キャッシュ
  useEffect(() => {
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
  }, []);

  // ピッチラインSVG（onlyMarkings: true）ロード
  useEffect(() => {
    const options = {
      strokeColor: pitchAppearance.lineColor,
      strokeWidth: pitchAppearance.lineWidth,
      strokeOpacity: pitchAppearance.lineOpacity,
      onlyMarkings: true,
    };
    const cached = getCachedPitchSvgImage(aspectRatio, options);
    if (cached) {
      setMarkingImage(cached);
      return;
    }

    let active = true;
    loadPitchSvgImage(aspectRatio, options)
      .then((img) => {
        if (active) {
          setMarkingImage(img);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [aspectRatio, pitchAppearance]);

  const targetPitchRect = useMemo(
    () => subPitchRect ?? calculatePitchRect({ width, height }, aspectRatio),
    [subPitchRect, width, height, aspectRatio],
  );

  // ピッチ内側領域の計算
  const pitchInnerBounds = useMemo(() => {
    const geom = calculatePitchGeometryForAspect(aspectRatio);
    const scaleX = targetPitchRect.width / geom.config.widthPx;
    const scaleY = targetPitchRect.height / geom.config.heightPx;
    return {
      left: targetPitchRect.x + geom.pitchLeft * scaleX,
      top: targetPitchRect.y + geom.pitchTop * scaleY,
      width: geom.pitchWidth * scaleX,
      height: geom.pitchHeight * scaleY,
    };
  }, [aspectRatio, targetPitchRect]);

  // 大理石カバー計算
  const marbleCoverRect = useMemo(() => {
    if (!marbleImage) return null;
    const imgWidth = marbleImage.naturalWidth || 679;
    const imgHeight = marbleImage.naturalHeight || 800;
    return calculatePitchTextureCover(pitchInnerBounds, {
      width: imgWidth,
      height: imgHeight,
    });
  }, [marbleImage, pitchInnerBounds]);

  const clipPitchInner = useCallback(
    (ctx: {
      beginPath: () => void;
      rect: (x: number, y: number, w: number, h: number) => void;
      closePath: () => void;
    }) => {
      ctx.beginPath();
      ctx.rect(
        pitchInnerBounds.left,
        pitchInnerBounds.top,
        pitchInnerBounds.width,
        pitchInnerBounds.height,
      );
      ctx.closePath();
    },
    [pitchInnerBounds],
  );

  return (
    <Group listening={false}>
      {/* 全体黒枠 */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#000000"
        listening={false}
      />
      {/* ピッチ内側クリップ領域 */}
      <Group clipFunc={clipPitchInner} listening={false}>
        {marbleImage && marbleCoverRect && (
          <KonvaImage
            image={marbleImage}
            x={marbleCoverRect.x}
            y={marbleCoverRect.y}
            width={marbleCoverRect.width}
            height={marbleCoverRect.height}
            listening={false}
            perfectDrawEnabled={false}
          />
        )}
        <Rect
          x={pitchInnerBounds.left}
          y={pitchInnerBounds.top}
          width={pitchInnerBounds.width}
          height={pitchInnerBounds.height}
          fill={pitchAppearance.overlayColor}
          opacity={pitchAppearance.overlayOpacity}
          globalCompositeOperation="overlay"
          listening={false}
        />
      </Group>
      {/* 最前面ピッチライン */}
      {markingImage && (
        <KonvaImage
          image={markingImage}
          x={targetPitchRect.x}
          y={targetPitchRect.y}
          width={targetPitchRect.width}
          height={targetPitchRect.height}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  );
}
