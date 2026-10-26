'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  horizontalPitchSvg,
  PITCH_ASPECT_RATIO,
} from './syntax-pitch-constants';

interface UseSyntaxPitchDimensionsProps {
  propWidth?: number;
  propHeight?: number;
}

export function useSyntaxPitchDimensions({
  propWidth,
  propHeight,
}: UseSyntaxPitchDimensionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  const [pitchImage, setPitchImage] = useState<HTMLImageElement | null>(null);

  // ピッチSVGのロード
  useEffect(() => {
    const img = new window.Image();
    const svg = new Blob([horizontalPitchSvg], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(svg);
    img.src = url;
    img.onload = () => {
      setPitchImage(img);
    };
    return () => {
      URL.revokeObjectURL(url);
    };
  }, []);

  // コンテナサイズ監視 (Responsive auto-fit)
  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // ステージの実サイズ計算 (アスペクト比 105:68 の維持)
  const { stageWidth, stageHeight } = useMemo(() => {
    if (propWidth && propHeight) {
      return { stageWidth: propWidth, stageHeight: propHeight };
    }

    const availableWidth = propWidth || containerDimensions.width || 630;
    const availableHeight =
      propHeight ||
      containerDimensions.height ||
      availableWidth / PITCH_ASPECT_RATIO;

    let targetWidth = availableWidth;
    let targetHeight = availableWidth / PITCH_ASPECT_RATIO;

    if (targetHeight > availableHeight && availableHeight > 0) {
      targetHeight = availableHeight;
      targetWidth = availableHeight * PITCH_ASPECT_RATIO;
    }

    return {
      stageWidth: Math.max(100, Math.round(targetWidth)),
      stageHeight: Math.max(68, Math.round(targetHeight)),
    };
  }, [propWidth, propHeight, containerDimensions]);

  return {
    containerRef,
    pitchImage,
    stageWidth,
    stageHeight,
  };
}
