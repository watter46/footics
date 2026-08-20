import { useDroppable } from '@dnd-kit/core';
import type React from 'react';
import {
  type BoardOrientation,
  useTacticalStore,
} from '@/stores/tactical-store';

interface PitchProps {
  orientation?: BoardOrientation;
  children?: React.ReactNode;
}

/**
 * サッカーピッチの背景SVG (水平: 105m x 68m / 垂直: 68m x 105m 両対応)
 */
export const Pitch: React.FC<PitchProps> = ({
  orientation: propOrientation,
  children,
}) => {
  const storeOrientation = useTacticalStore((s) => s.orientation);
  const orientation = propOrientation || storeOrientation;

  const { setNodeRef } = useDroppable({
    id: 'pitch',
    data: {
      accepts: ['player', 'ball'],
    },
  });

  const lineColor = '#e2b48d';
  const strokeWidth = 0.4;
  const opacity = 0.7;

  const isVertical = orientation === 'vertical';

  return (
    <div
      ref={setNodeRef}
      className={`relative w-full ${
        isVertical ? 'aspect-[68/105]' : 'aspect-[105/68]'
      } bg-slate-950 rounded-lg border-2 border-slate-800 shadow-2xl overflow-visible select-none`}
    >
      {isVertical ? (
        /* 縦向きピッチ (68 x 105) */
        <svg
          viewBox="-1 -1 70 107"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {/* 外枠 */}
          <rect
            x="0"
            y="0"
            width="68"
            height="105"
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />

          {/* センターライン */}
          <line
            x1="0"
            y1="52.5"
            x2="68"
            y2="52.5"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />

          {/* センターサークル */}
          <circle
            cx="34"
            cy="52.5"
            r="9.15"
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
          <circle
            cx="34"
            cy="52.5"
            r="0.4"
            fill={lineColor}
            opacity={opacity}
          />

          {/* ペナルティエリア (上/Away) */}
          <rect
            x="13.85"
            y="0"
            width="40.3"
            height="16.5"
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
          <rect
            x="24.85"
            y="0"
            width="18.3"
            height="5.5"
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
          <circle cx="34" cy="11" r="0.3" fill={lineColor} opacity={opacity} />
          <path
            d="M 26.69 16.5 A 9.15 9.15 0 0 0 41.31 16.5"
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />

          {/* ペナルティエリア (下/Home) */}
          <rect
            x="13.85"
            y="88.5"
            width="40.3"
            height="16.5"
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
          <rect
            x="24.85"
            y="99.5"
            width="18.3"
            height="5.5"
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
          <circle cx="34" cy="94" r="0.3" fill={lineColor} opacity={opacity} />
          <path
            d="M 26.69 88.5 A 9.15 9.15 0 0 1 41.31 88.5"
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        </svg>
      ) : (
        /* 横向きピッチ (105 x 68) */
        <svg
          viewBox="-1 -1 107 70"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {/* 外枠 */}
          <rect
            x="0"
            y="0"
            width="105"
            height="68"
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />

          {/* センターライン */}
          <line
            x1="52.5"
            y1="0"
            x2="52.5"
            y2="68"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />

          {/* センターサークル */}
          <circle
            cx="52.5"
            cy="34"
            r="9.15"
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
          <circle
            cx="52.5"
            cy="34"
            r="0.4"
            fill={lineColor}
            opacity={opacity}
          />

          {/* ペナルティエリア (左) */}
          <rect
            x="0"
            y="13.85"
            width="16.5"
            height="40.3"
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
          <rect
            x="0"
            y="24.85"
            width="5.5"
            height="18.3"
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
          <circle cx="11" cy="34" r="0.3" fill={lineColor} opacity={opacity} />
          <path
            d="M 16.5 26.69 A 9.15 9.15 0 0 1 16.5 41.31"
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />

          {/* ペナルティエリア (右) */}
          <rect
            x="88.5"
            y="13.85"
            width="16.5"
            height="40.3"
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
          <rect
            x="99.5"
            y="24.85"
            width="5.5"
            height="18.3"
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
          <circle cx="94" cy="34" r="0.3" fill={lineColor} opacity={opacity} />
          <path
            d="M 88.5 26.69 A 9.15 9.15 0 0 0 88.5 41.31"
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        </svg>
      )}
      <div className="absolute inset-0 z-10 w-full h-full">{children}</div>
    </div>
  );
};
