'use client';

/**
 * pitch-background-dom.tsx
 * DOM-based Pitch Background component with CSS 3D transformation support.
 * Renders pitch background (grass, lines, or custom image) in DOM layer,
 * allowing CSS 3D tilt without distorting 2D Konva annotations/markers.
 */

import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import type { AspectRatio } from '@/lib/types/tactical-unified';
import { usePitchImage } from '../hooks/use-pitch-image';

export interface PitchBackgroundDomProps {
  width: number;
  height: number;
  tilt: number;
  perspective?: number;
  panX: number;
  panY: number;
  zoom: number;
  aspectRatio?: AspectRatio;
  backgroundImageUrl?: string;
  backgroundType?: 'pitch' | 'image' | 'blank';
  marginPercent?: number;
  grass?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function PitchBackgroundDom({
  width,
  height,
  tilt,
  perspective = 1000,
  panX,
  panY,
  zoom,
  aspectRatio = '16:9',
  backgroundImageUrl,
  backgroundType = 'pitch',
  marginPercent,
  grass = true,
  className,
  style,
}: PitchBackgroundDomProps) {
  const { pitchImg, bgImg } = usePitchImage({
    aspectRatio,
    marginPercent,
    grass,
    backgroundType,
    backgroundImageUrl,
  });

  const containerStyle: CSSProperties = useMemo(() => {
    return {
      position: 'absolute',
      inset: 0,
      width,
      height,
      overflow: 'hidden',
      pointerEvents: 'none',
      backgroundColor: '#020617',
      perspective: tilt !== 0 && perspective ? `${perspective}px` : undefined,
      ...style,
    };
  }, [width, height, tilt, perspective, style]);

  const transformStyle: CSSProperties = useMemo(() => {
    const transform =
      tilt !== 0
        ? `translate3d(${panX}px, ${panY}px, 0) scale(${zoom}) rotateX(${tilt}deg)`
        : `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`;

    return {
      width,
      height,
      transformOrigin: '50% 50%',
      transform,
      transformStyle: tilt !== 0 ? 'preserve-3d' : undefined,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  }, [width, height, panX, panY, zoom, tilt]);

  return (
    <div
      className={`pitch-background-dom absolute inset-0 overflow-hidden pointer-events-none ${className ?? ''}`}
      style={containerStyle}
      aria-hidden="true"
    >
      <div style={transformStyle}>
        {backgroundType === 'pitch' && pitchImg && (
          <img
            src={pitchImg.src}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              userSelect: 'none',
            }}
          />
        )}
        {backgroundType === 'image' && bgImg && (
          <img
            src={bgImg.src}
            alt=""
            draggable={false}
            style={{
              width: '96%',
              height: '96%',
              objectFit: 'contain',
              display: 'block',
              userSelect: 'none',
            }}
          />
        )}
      </div>
    </div>
  );
}
