'use client';

/**
 * pitch-background.tsx
 * Unified canvas — ピッチ背景
 * 既存 animation-pitch.tsx の SVG アセットを流用し、
 * aspectRatio (16:9 / 9:16) に応じて横/縦を切り替え
 */

import { useEffect, useState } from 'react';
import { Image as KonvaImage, Rect } from 'react-konva';
import type { AspectRatio } from '@/lib/types/tactical-unified';

// ── 16:9 / 9:16 比率に完全適合し、105m x 68m のピッチ歪みを完全解消したSVG ──

const HORIZONTAL_SVG = `<svg viewBox="-9.722 -1 124.444 70" xmlns="http://www.w3.org/2000/svg">
  <rect x="-9.722" y="-1" width="124.444" height="70" fill="#020617" />
  <rect x="0" y="0" width="105" height="68" fill="#020617" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <line x1="52.5" y1="0" x2="52.5" y2="68" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="52.5" cy="34" r="0.4" fill="#e2b48d" opacity="0.8"/>
  <rect x="0" y="13.85" width="16.5" height="40.3" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="0" y="24.85" width="5.5" height="18.3" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="11" cy="34" r="0.3" fill="#e2b48d" opacity="0.8"/>
  <path d="M 16.5 26.69 A 9.15 9.15 0 0 1 16.5 41.31" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="88.5" y="13.85" width="16.5" height="40.3" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="99.5" y="24.85" width="5.5" height="18.3" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="94" cy="34" r="0.3" fill="#e2b48d" opacity="0.8"/>
  <path d="M 88.5 26.69 A 9.15 9.15 0 0 0 88.5 41.31" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
</svg>`;

const VERTICAL_SVG = `<svg viewBox="-1 -9.722 70 124.444" xmlns="http://www.w3.org/2000/svg">
  <rect x="-1" y="-9.722" width="70" height="124.444" fill="#020617" />
  <rect x="0" y="0" width="68" height="105" fill="#020617" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <line x1="0" y1="52.5" x2="68" y2="52.5" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="34" cy="52.5" r="9.15" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="34" cy="52.5" r="0.4" fill="#e2b48d" opacity="0.8"/>
  <rect x="13.85" y="0" width="40.3" height="16.5" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="24.85" y="0" width="18.3" height="5.5" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="34" cy="11" r="0.3" fill="#e2b48d" opacity="0.8"/>
  <path d="M 26.69 16.5 A 9.15 9.15 0 0 0 41.31 16.5" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="13.85" y="88.5" width="40.3" height="16.5" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="24.85" y="99.5" width="18.3" height="5.5" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="34" cy="94" r="0.3" fill="#e2b48d" opacity="0.8"/>
  <path d="M 26.69 88.5 A 9.15 9.15 0 0 1 41.31 88.5" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
</svg>`;

function svgToImage(svgString: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG load failed'));
    };
    img.src = url;
  });
}

interface PitchBackgroundProps {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  /** 背景画像URL (スクショバインド等) */
  backgroundImageUrl?: string;
  backgroundType?: 'pitch' | 'image' | 'blank';
}

export function PitchBackground({
  width,
  height,
  aspectRatio,
  backgroundImageUrl,
  backgroundType = 'pitch',
}: PitchBackgroundProps) {
  const [pitchImg, setPitchImg] = useState<HTMLImageElement | null>(null);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);

  // ピッチSVG ロード
  useEffect(() => {
    if (backgroundType !== 'pitch') return;
    const svgStr = aspectRatio === '9:16' ? VERTICAL_SVG : HORIZONTAL_SVG;
    let cancelled = false;
    svgToImage(svgStr)
      .then((img) => {
        if (!cancelled) setPitchImg(img);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [aspectRatio, backgroundType]);

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

      {/* ピッチ or 背景画像 */}
      {backgroundType === 'pitch' && pitchImg && (
        <KonvaImage
          image={pitchImg}
          x={0}
          y={0}
          width={width}
          height={height}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
      {backgroundType === 'image' && bgImg && (
        <KonvaImage
          image={bgImg}
          x={0}
          y={0}
          width={width}
          height={height}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </>
  );
}
