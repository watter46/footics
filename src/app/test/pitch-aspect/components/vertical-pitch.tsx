'use client';

import type { PitchLayoutGeometry } from '../pitch-constants';

interface PitchProps {
  geom: PitchLayoutGeometry;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  showCircleRuler?: boolean;
}

function VerticalPitchGrass({ geom }: { geom: PitchLayoutGeometry }) {
  const stripeHeight = geom.pitchHeight / 18;
  return (
    <>
      {/* ピッチ地色 (5%余白の内側領域を完璧に埋めるベース背景) */}
      <rect
        x={geom.pitchLeft}
        y={geom.pitchTop}
        width={geom.pitchWidth}
        height={geom.pitchHeight}
        fill="#080e1e"
      />
      {Array.from({ length: 18 }).map((_, i) => (
        <rect
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed pitch grass stripes
          key={`v-stripe-${i}`}
          x={geom.pitchLeft}
          y={geom.pitchTop + i * stripeHeight}
          width={geom.pitchWidth}
          height={stripeHeight}
          fill={i % 2 === 0 ? '#0d1833' : '#091024'}
          opacity={0.65}
        />
      ))}
    </>
  );
}

function VerticalPenaltyAreas({
  geom,
  strokeColor,
  strokeWidth,
  strokeOpacity,
}: {
  geom: PitchLayoutGeometry;
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
}) {
  const r = geom.centerCircleRadius;
  const arcOffset = Math.sqrt(
    Math.max(0, r * r - (geom.paDepth - geom.penaltySpotDist) ** 2),
  );

  return (
    <>
      {/* ペナルティエリア（上・下） */}
      <rect
        x={geom.centerX - geom.paWidth / 2}
        y={geom.pitchTop}
        width={geom.paWidth}
        height={geom.paDepth}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
      />
      <rect
        x={geom.centerX - geom.paWidth / 2}
        y={geom.pitchTop + geom.pitchHeight - geom.paDepth}
        width={geom.paWidth}
        height={geom.paDepth}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
      />
      {/* ゴールエリア（上・下） */}
      <rect
        x={geom.centerX - geom.gaWidth / 2}
        y={geom.pitchTop}
        width={geom.gaWidth}
        height={geom.gaDepth}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
      />
      <rect
        x={geom.centerX - geom.gaWidth / 2}
        y={geom.pitchTop + geom.pitchHeight - geom.gaDepth}
        width={geom.gaWidth}
        height={geom.gaDepth}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
      />
      {/* ペナルティスポット */}
      <circle
        cx={geom.centerX}
        cy={geom.pitchTop + geom.penaltySpotDist}
        r={0.3 * geom.meterScale}
        fill={strokeColor}
        opacity={strokeOpacity}
      />
      <circle
        cx={geom.centerX}
        cy={geom.pitchTop + geom.pitchHeight - geom.penaltySpotDist}
        r={0.3 * geom.meterScale}
        fill={strokeColor}
        opacity={strokeOpacity}
      />
      {/* ペナルティアーク */}
      <path
        d={`M ${geom.centerX - arcOffset} ${geom.pitchTop + geom.paDepth} A ${r} ${r} 0 0 0 ${geom.centerX + arcOffset} ${geom.pitchTop + geom.paDepth}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
      />
      <path
        d={`M ${geom.centerX - arcOffset} ${geom.pitchTop + geom.pitchHeight - geom.paDepth} A ${r} ${r} 0 0 1 ${geom.centerX + arcOffset} ${geom.pitchTop + geom.pitchHeight - geom.paDepth}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
      />
    </>
  );
}

function VerticalCenterCircle({
  geom,
  strokeColor,
  strokeWidth,
  strokeOpacity,
  showCircleRuler,
}: {
  geom: PitchLayoutGeometry;
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  showCircleRuler: boolean;
}) {
  const r = geom.centerCircleRadius;
  return (
    <>
      <circle
        cx={geom.centerX}
        cy={geom.centerY}
        r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
      />
      <circle
        cx={geom.centerX}
        cy={geom.centerY}
        r={0.4 * geom.meterScale}
        fill={strokeColor}
        opacity={strokeOpacity}
      />
      {showCircleRuler && (
        <g id="circle-ruler-v" className="no-export" opacity={0.75}>
          <line
            x1={geom.centerX - r}
            y1={geom.centerY}
            x2={geom.centerX + r}
            y2={geom.centerY}
            stroke="#38bdf8"
            strokeWidth={0.25 * geom.meterScale}
            strokeDasharray={`${0.8 * geom.meterScale}, ${0.4 * geom.meterScale}`}
          />
          <line
            x1={geom.centerX}
            y1={geom.centerY - r}
            x2={geom.centerX}
            y2={geom.centerY + r}
            stroke="#38bdf8"
            strokeWidth={0.25 * geom.meterScale}
            strokeDasharray={`${0.8 * geom.meterScale}, ${0.4 * geom.meterScale}`}
          />
          <text
            x={geom.centerX}
            y={geom.centerY - 1.2 * geom.meterScale}
            fill="#38bdf8"
            fontSize={1.4 * geom.meterScale}
            textAnchor="middle"
            fontWeight="bold"
          >
            Ø 18.30m (厳密真円)
          </text>
        </g>
      )}
    </>
  );
}

export function VerticalPitch({
  geom,
  strokeColor = '#e2b48d',
  strokeOpacity = 0.85,
  strokeWidth = 4,
  showCircleRuler = true,
}: PitchProps) {
  const arcR = geom.cornerArcRadius;
  const left = geom.pitchLeft;
  const right = geom.pitchLeft + geom.pitchWidth;
  const top = geom.pitchTop;
  const bottom = geom.pitchTop + geom.pitchHeight;

  return (
    <g id="vertical-pitch">
      <VerticalPitchGrass geom={geom} />
      {/* 外枠タッチライン・ゴールライン */}
      <rect
        x={left}
        y={top}
        width={geom.pitchWidth}
        height={geom.pitchHeight}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
      />
      {/* ハーフウェーライン */}
      <line
        x1={left}
        y1={geom.centerY}
        x2={right}
        y2={geom.centerY}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
      />
      <VerticalCenterCircle
        geom={geom}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
        showCircleRuler={showCircleRuler}
      />
      <VerticalPenaltyAreas
        geom={geom}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
      />
      {/* コーナーアーク (半径 1m) */}
      <path
        d={`M ${left} ${top + arcR} A ${arcR} ${arcR} 0 0 0 ${left + arcR} ${top}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
      />
      <path
        d={`M ${right - arcR} ${top} A ${arcR} ${arcR} 0 0 0 ${right} ${top + arcR}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
      />
      <path
        d={`M ${left + arcR} ${bottom} A ${arcR} ${arcR} 0 0 0 ${left} ${bottom - arcR}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
      />
      <path
        d={`M ${right} ${bottom - arcR} A ${arcR} ${arcR} 0 0 0 ${right - arcR} ${bottom}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
      />
    </g>
  );
}
