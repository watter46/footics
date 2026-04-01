import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface PitchProps {
  children?: React.ReactNode;
}

/**
 * サッカーピッチの背景SVG (水平: 105m x 68m)
 */
export const Pitch: React.FC<PitchProps> = ({ children }) => {
  const { setNodeRef } = useDroppable({
    id: 'pitch',
    data: {
      accepts: ['player', 'ball'],
    },
  });

  const lineColor = "#e2b48d";
  const strokeWidth = 0.4;
  const opacity = 0.7;

  return (
    <div 
      ref={setNodeRef}
      className="relative w-full aspect-[105/68] bg-slate-950 rounded-lg border-2 border-slate-800 shadow-2xl overflow-hidden select-none"
    >
      <svg
        viewBox="-1 -1 107 70"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {/* 外枠 */}
        <rect x="0" y="0" width="105" height="68" fill="none" stroke={lineColor} strokeWidth={strokeWidth} opacity={opacity} />
        
        {/* センターライン */}
        <line x1="52.5" y1="0" x2="52.5" y2="68" stroke={lineColor} strokeWidth={strokeWidth} opacity={opacity} />
        
        {/* センターサークル */}
        <circle cx="52.5" cy="34" r="9.15" fill="none" stroke={lineColor} strokeWidth={strokeWidth} opacity={opacity} />
        <circle cx="52.5" cy="34" r="0.4" fill={lineColor} opacity={opacity} />
        
        {/* ペナルティエリア (左) */}
        <rect x="0" y="13.85" width="16.5" height="40.3" fill="none" stroke={lineColor} strokeWidth={strokeWidth} opacity={opacity} />
        <rect x="0" y="24.85" width="5.5" height="18.3" fill="none" stroke={lineColor} strokeWidth={strokeWidth} opacity={opacity} />
        <circle cx="11" cy="34" r="0.3" fill={lineColor} opacity={opacity} />
        <path d="M 16.5 26.69 A 9.15 9.15 0 0 1 16.5 41.31" fill="none" stroke={lineColor} strokeWidth={strokeWidth} opacity={opacity} />
        
        {/* ペナルティエリア (右) */}
        <rect x="88.5" y="13.85" width="16.5" height="40.3" fill="none" stroke={lineColor} strokeWidth={strokeWidth} opacity={opacity} />
        <rect x="99.5" y="24.85" width="5.5" height="18.3" fill="none" stroke={lineColor} strokeWidth={strokeWidth} opacity={opacity} />
        <circle cx="94" cy="34" r="0.3" fill={lineColor} opacity={opacity} />
        <path d="M 88.5 26.69 A 9.15 9.15 0 0 0 88.5 41.31" fill="none" stroke={lineColor} strokeWidth={strokeWidth} opacity={opacity} />
      </svg>
      <div className="absolute inset-0 z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
