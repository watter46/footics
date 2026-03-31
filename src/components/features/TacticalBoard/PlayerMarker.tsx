"use client";

import React, { useRef, useState } from 'react';
import { shortenName } from '@/lib/data/tactical-utils';

interface PlayerMarkerProps {
  id: string; // matchId-playerId
  playerName: string;
  initialX: number; // 0-100
  initialY: number; // 0-100
  color?: string;
  onPositionChange: (id: string, x: number, y: number) => void;
  isFlipped?: boolean;
}

/**
 * 選手マーカー
 * ドラッグ可能、座標保存（アニメーションなし）
 */
export const PlayerMarker: React.FC<PlayerMarkerProps> = ({
  id,
  playerName,
  initialX,
  initialY,
  color = "#3b82f6", // blue-500
  onPositionChange,
}) => {
  const markerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const isMoving = useRef(false);
  
  const displayName = shortenName(playerName);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!markerRef.current) return;
    
    isMoving.current = true;
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    
    // ポインターをキャプチャして要素外に出てもイベントを継続させる
    markerRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isMoving.current || !markerRef.current) return;

    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;

    // 直接スタイルを更新することで、Reactの再レンダリングを回避し即時反映させる
    markerRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isMoving.current || !markerRef.current) return;

    isMoving.current = false;
    setIsDragging(false);
    
    const parent = markerRef.current.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    // 親要素内でのマウス離脱座標を計算
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    // 0-100のパーセンテージに変換
    const newX = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
    const newY = Math.max(0, Math.min(100, (offsetY / rect.height) * 100));

    // ドラッグ用の変形をリセット
    markerRef.current.style.transform = "";

    // 座標確定を通知
    onPositionChange(id, newX, newY);
  };

  return (
    <div
      ref={markerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: "absolute",
        left: `${initialX}%`,
        top: `${initialY}%`,
        zIndex: 20,
        touchAction: "none", // モバイルでのスクロール干渉を防止
      }}
      className={`cursor-grab ${isDragging ? "cursor-grabbing" : ""}`}
    >
      <div className="flex flex-col items-center gap-1 group -translate-x-1/2 -translate-y-1/2 select-none">
        <div 
          className="w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center font-bold text-white text-xs select-none"
          style={{ backgroundColor: color }}
        >
          {displayName.charAt(0)}
        </div>
        <div className="bg-slate-900/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-slate-100 whitespace-nowrap opacity-100 select-none pointer-events-none">
          {displayName}
        </div>
      </div>
    </div>
  );
};