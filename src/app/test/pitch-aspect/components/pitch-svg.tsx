'use client';

import {
  type BoundaryConfig,
  calculatePitchGeometry,
} from '../pitch-constants';
import { HorizontalPitch } from './horizontal-pitch';
import { VerticalPitch } from './vertical-pitch';

interface PitchSvgProps {
  config: BoundaryConfig;
  marginPercent?: number;
  showCircleRuler?: boolean;
}

export function PitchSvg({
  config,
  marginPercent = 5.0,
  showCircleRuler = true,
}: PitchSvgProps) {
  const isHorizontal = config.orientation === 'horizontal';
  const geom = calculatePitchGeometry(
    config.widthPx,
    config.heightPx,
    marginPercent,
    config.orientation,
  );

  return (
    <svg
      viewBox={config.viewBox}
      className="w-full h-full block select-none pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 境界線全体の背景 (エクスポート枠の全領域) */}
      <rect
        x={0}
        y={0}
        width={config.widthPx}
        height={config.heightPx}
        fill="#020617"
      />

      {/* 余白ガイドライン (5% 余白領域の可視化: no-export のためPNGには映らない) */}
      <rect
        className="no-export"
        x={geom.pitchLeft}
        y={geom.pitchTop}
        width={geom.pitchWidth}
        height={geom.pitchHeight}
        fill="none"
        stroke="#38bdf8"
        strokeWidth={1}
        strokeDasharray="4, 4"
        strokeOpacity={0.25}
      />

      {isHorizontal ? (
        <HorizontalPitch geom={geom} showCircleRuler={showCircleRuler} />
      ) : (
        <VerticalPitch geom={geom} showCircleRuler={showCircleRuler} />
      )}
    </svg>
  );
}
