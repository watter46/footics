"use client";

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { shortenName } from '@/lib/data/tactical-utils';

interface PlayerMarkerProps {
  id: string; // matchId-playerId または "ball"
  playerName: string;
  initialX: number; // 0-100 (Parent relative)
  initialY: number; // 0-100 (Parent relative)
  color?: string;
  isBall?: boolean;
}

/**
 * リアルなサッカーボールのSVGコンポーネント (正円)
 */
const SoccerBallSVG = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
    <circle cx="50" cy="50" r="48" fill="white" stroke="#333" strokeWidth="2" />
    <path d="M50 2L61 24L50 40L39 24Z" fill="#333" />
    <path d="M85 35L98 52L82 68L70 55Z" fill="#333" />
    <path d="M15 35L2 52L18 68L30 55Z" fill="#333" />
    <path d="M50 98L65 80L50 65L35 80Z" fill="#333" />
    <path d="M85 75L72 92L58 85L68 70Z" fill="#333" />
    <path d="M15 75L28 92L42 85L32 70Z" fill="#333" />
    <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
  </svg>
);

/**
 * 選手・ボールマーカー (dnd-kit Draggable)
 * ハンドルの中心ズレ（ジャンプ）を防止し、精密な操作感を実現。
 */
export const PlayerMarker: React.FC<PlayerMarkerProps> = ({
  id,
  playerName,
  initialX,
  initialY,
  color = "#3b82f6",
  isBall = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
    data: {
      type: isBall ? 'ball' : 'player',
    },
  });

  const displayName = shortenName(playerName);

  // マーカーサイズ (w-10 = 40px, w-6 = 24px)
  const markerSize = isBall ? 24 : 40;

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${initialX}%`,
    top: `${initialY}%`,
    zIndex: isDragging ? 1000 : 20,
    touchAction: "none",
    width: `${markerSize}px`,
    height: `${markerSize}px`,
    // dnd-kit の計測を妨げないための -50% 補正
    // transform は dnd-kit の移動量 (px) + 初期位置補正 (-50%)
    transform: transform 
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) translate(-50%, -50%)` 
      : `translate(-50%, -50%)`,
    // ドラッグ時の二重表示(残像)を完全に消去
    opacity: isDragging ? 0 : 1,
    transition: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "z-50" : ""}`}
    >
      <div className="relative w-full h-full group select-none">
        {/* 正円マーカー本体 */}
        <div 
          className={`rounded-full border-2 border-white shadow flex items-center justify-center font-bold text-white w-full h-full ${isDragging ? 'shadow-2xl' : ''}`}
          style={{ backgroundColor: isBall ? 'transparent' : color, border: isBall ? 'none' : undefined }}
        >
          {isBall && <SoccerBallSVG />}
          {!isBall && <span className="text-[10px]">{displayName.charAt(0)}</span>}
        </div>

        {/* 選手名: 絶対配置でオーバーフローを許可 */}
        {!isBall && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 bg-slate-900/90 rounded text-[9px] text-slate-100 whitespace-nowrap pointer-events-none border border-slate-700/50 shadow-sm z-50">
            {displayName}
          </div>
        )}
      </div>
    </div>
  );
};