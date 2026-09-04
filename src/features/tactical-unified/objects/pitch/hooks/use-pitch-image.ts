'use client';

import { useEffect, useState } from 'react';
import {
  getCachedPitchSvgImage,
  loadPitchSvgImage,
  preloadAllPitchSvgImages,
} from '@/lib/tactical/pitch-svg';
import type { AspectRatio } from '@/lib/types/tactical-unified';

export interface UsePitchImageOptions {
  aspectRatio: AspectRatio;
  marginPercent?: number;
  grass?: boolean;
  backgroundType?: 'pitch' | 'image' | 'blank';
  backgroundImageUrl?: string;
}

export function usePitchImage({
  aspectRatio,
  marginPercent,
  grass = true,
  backgroundType = 'pitch',
  backgroundImageUrl,
}: UsePitchImageOptions) {
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

  return {
    pitchImg,
    bgImg,
  };
}
