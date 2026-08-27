import type React from 'react';

interface SyntaxPitchSvgProps {
  className?: string;
  gridOpacity?: number;
}

/**
 * 16:9 サッカーピッチ背景SVGコンポーネント
 * viewBox: 0 0 1000 562.5 (16:9)
 * 横 0..1000, 縦 0..562.5
 */
export const SyntaxPitchSvg: React.FC<SyntaxPitchSvgProps> = ({
  className,
  gridOpacity = 0.15,
}) => {
  const lineColor = '#38bdf8'; // Cyan tactical line
  const lineOpacity = 0.45;
  const strokeWidth = 2.5;

  return (
    <svg
      viewBox="0 0 1000 562.5"
      preserveAspectRatio="none"
      className={
        className ??
        'absolute inset-0 w-full h-full pointer-events-none select-none'
      }
    >
      <defs>
        {/* ピッチの芝生ストライプパターン */}
        <pattern
          id="pitch-stripes"
          width="100"
          height="562.5"
          patternUnits="userSpaceOnUse"
        >
          <rect x="0" y="0" width="50" height="562.5" fill="#091424" />
          <rect x="50" y="0" width="50" height="562.5" fill="#0b1a2f" />
        </pattern>

        {/* ゾーン・グリッドガイド */}
        <pattern
          id="pitch-grid"
          width="50"
          height="56.25"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 50 0 L 0 0 0 56.25"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="0.8"
            opacity={gridOpacity}
          />
        </pattern>

        {/* 矢印マーカーの定義 */}
        <marker
          id="arrow-pass"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38bdf8" />
        </marker>
        <marker
          id="arrow-move"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#fbbf24" />
        </marker>
        <marker
          id="arrow-dribble"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#a855f7" />
        </marker>
        <marker
          id="arrow-defend"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#ef4444" />
        </marker>
      </defs>

      {/* ピッチベース背景 */}
      <rect x="0" y="0" width="1000" height="562.5" fill="#070f1e" />
      <rect
        x="0"
        y="0"
        width="1000"
        height="562.5"
        fill="url(#pitch-stripes)"
      />
      <rect x="0" y="0" width="1000" height="562.5" fill="url(#pitch-grid)" />

      {/* 外枠 */}
      <rect
        x="30"
        y="25"
        width="940"
        height="512.5"
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        opacity={lineOpacity}
        rx="4"
      />

      {/* センターライン */}
      <line
        x1="500"
        y1="25"
        x2="500"
        y2="537.5"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        opacity={lineOpacity}
      />

      {/* センターサークル */}
      <circle
        cx="500"
        cy="281.25"
        r="75"
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        opacity={lineOpacity}
      />
      <circle
        cx="500"
        cy="281.25"
        r="4"
        fill={lineColor}
        opacity={lineOpacity + 0.2}
      />

      {/* 左ペナルティエリア (Home) */}
      <rect
        x="30"
        y="125"
        width="160"
        height="312.5"
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        opacity={lineOpacity}
      />
      {/* 左ゴールエリア */}
      <rect
        x="30"
        y="195"
        width="55"
        height="172.5"
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        opacity={lineOpacity}
      />
      {/* 左ペナルティスポット */}
      <circle
        cx="140"
        cy="281.25"
        r="3.5"
        fill={lineColor}
        opacity={lineOpacity + 0.2}
      />
      {/* 左ペナルティアーク */}
      <path
        d="M 190 230 A 75 75 0 0 1 190 332.5"
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        opacity={lineOpacity}
      />

      {/* 右ペナルティエリア (Away) */}
      <rect
        x="810"
        y="125"
        width="160"
        height="312.5"
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        opacity={lineOpacity}
      />
      {/* 右ゴールエリア */}
      <rect
        x="915"
        y="195"
        width="55"
        height="172.5"
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        opacity={lineOpacity}
      />
      {/* 右ペナルティスポット */}
      <circle
        cx="860"
        cy="281.25"
        r="3.5"
        fill={lineColor}
        opacity={lineOpacity + 0.2}
      />
      {/* 右ペナルティアーク */}
      <path
        d="M 810 230 A 75 75 0 0 0 810 332.5"
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        opacity={lineOpacity}
      />

      {/* コーナーアーク */}
      <path
        d="M 30 40 A 15 15 0 0 0 45 25"
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        opacity={lineOpacity}
      />
      <path
        d="M 30 522.5 A 15 15 0 0 1 45 537.5"
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        opacity={lineOpacity}
      />
      <path
        d="M 970 40 A 15 15 0 0 1 955 25"
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        opacity={lineOpacity}
      />
      <path
        d="M 970 522.5 A 15 15 0 0 0 955 537.5"
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        opacity={lineOpacity}
      />

      {/* ゴール枠 */}
      <rect
        x="18"
        y="245"
        width="12"
        height="72.5"
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        opacity={lineOpacity * 0.8}
      />
      <rect
        x="970"
        y="245"
        width="12"
        height="72.5"
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        opacity={lineOpacity * 0.8}
      />
    </svg>
  );
};
