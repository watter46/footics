'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';
import type { BoundaryConfig } from '../pitch-constants';
import { PitchSvg } from './pitch-svg';

interface PitchStageProps {
  exportRef: RefObject<HTMLDivElement | null>;
  config: BoundaryConfig;
  marginPercent: number;
  showCircleRuler: boolean;
  showSamplePlayers: boolean;
  zoom: number;
  pan: { x: number; y: number };
  tilt: number;
  isDragging: boolean;
  onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
}

// サンプル選手データ (ピッチ実領域内での比率 0〜100%)
const SAMPLE_PLAYERS_H = [
  // Home Team (青): 4-3-3
  { id: 'H-GK', x: 6, y: 50, num: '1', name: 'GK', color: '#38bdf8' },
  { id: 'H-CB1', x: 20, y: 35, num: '4', name: 'CB', color: '#38bdf8' },
  { id: 'H-CB2', x: 20, y: 65, num: '5', name: 'CB', color: '#38bdf8' },
  { id: 'H-LB', x: 24, y: 15, num: '3', name: 'LB', color: '#38bdf8' },
  { id: 'H-RB', x: 24, y: 85, num: '2', name: 'RB', color: '#38bdf8' },
  { id: 'H-DM', x: 34, y: 50, num: '6', name: 'DM', color: '#38bdf8' },
  { id: 'H-CM1', x: 42, y: 32, num: '8', name: 'CM', color: '#38bdf8' },
  { id: 'H-CM2', x: 42, y: 68, num: '10', name: 'CM', color: '#38bdf8' },
  { id: 'H-LW', x: 56, y: 18, num: '11', name: 'LW', color: '#38bdf8' },
  { id: 'H-RW', x: 56, y: 82, num: '7', name: 'RW', color: '#38bdf8' },
  { id: 'H-CF', x: 60, y: 50, num: '9', name: 'CF', color: '#38bdf8' },
  // Away Team (赤): 4-2-3-1
  { id: 'A-GK', x: 94, y: 50, num: '1', name: 'GK', color: '#f43f5e' },
  { id: 'A-CB1', x: 80, y: 38, num: '4', name: 'CB', color: '#f43f5e' },
  { id: 'A-CB2', x: 80, y: 62, num: '5', name: 'CB', color: '#f43f5e' },
  { id: 'A-LB', x: 76, y: 85, num: '3', name: 'LB', color: '#f43f5e' },
  { id: 'A-RB', x: 76, y: 15, num: '2', name: 'RB', color: '#f43f5e' },
  { id: 'A-DM1', x: 66, y: 40, num: '6', name: 'DM', color: '#f43f5e' },
  { id: 'A-DM2', x: 66, y: 60, num: '8', name: 'DM', color: '#f43f5e' },
  { id: 'A-AM', x: 58, y: 50, num: '10', name: 'AM', color: '#f43f5e' },
  { id: 'A-LW', x: 52, y: 82, num: '11', name: 'LW', color: '#f43f5e' },
  { id: 'A-RW', x: 52, y: 18, num: '7', name: 'RW', color: '#f43f5e' },
  { id: 'A-CF', x: 44, y: 50, num: '9', name: 'CF', color: '#f43f5e' },
];

export function PitchStage({
  exportRef,
  config,
  marginPercent,
  showCircleRuler,
  showSamplePlayers,
  zoom,
  pan,
  tilt,
  isDragging,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
}: PitchStageProps) {
  const isHorizontal = config.orientation === 'horizontal';
  const marginRatio = marginPercent / 100;
  const usableRatio = 1 - 2 * marginRatio;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  }>({
    width: 800,
    height: 450,
  });

  // キャンバス画面の最大まで境界線を広げる（境界線可視性のために上下左右に20px余白）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const containerW = el.clientWidth;
      const containerH = el.clientHeight;
      if (containerW <= 0 || containerH <= 0) return;

      // キャンバスと境界線の間の可視性確保用マージン (上下左右各 20px)
      const CANVAS_PADDING = 20;
      const availW = Math.max(100, containerW - CANVAS_PADDING * 2);
      const availH = Math.max(100, containerH - CANVAS_PADDING * 2);

      let w = availW;
      let h = availH;
      if (availW / availH > config.ratio) {
        // コンテナが横に広い -> 高さに合わせて幅を算出
        h = availH;
        w = h * config.ratio;
      } else {
        // コンテナが縦に広い -> 幅に合わせて高さを算出
        w = availW;
        h = w / config.ratio;
      }

      setDimensions({ width: Math.round(w), height: Math.round(h) });
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [config.ratio]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Tactical pitch canvas"
      className={`relative w-full h-[650px] max-h-[78vh] flex items-center justify-center overflow-hidden bg-slate-950/95 rounded-2xl border border-slate-800 shadow-2xl select-none outline-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      style={{ perspective: '1200px' }}
    >
      {/* 3Dチルト & パン & ズーム適用コンテナ */}
      <div
        className="relative origin-center shadow-2xl rounded-xl flex items-center justify-center"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom}) rotateX(${tilt}deg)`,
          transformStyle: 'preserve-3d',
          transition: isDragging ? 'none' : 'transform 0.08s ease-out',
        }}
      >
        {/* ─── 境界線マスターフレーム (この要素の矩形範囲がPNGとして100%出力される) ─── */}
        <div
          ref={exportRef}
          className="relative overflow-hidden bg-slate-950 transition-[width,height] duration-150"
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            aspectRatio: `${config.widthPx} / ${config.heightPx}`,
          }}
        >
          {/* ピッチSVG (境界線内に上下左右5%余白で配置) */}
          <PitchSvg
            config={config}
            marginPercent={marginPercent}
            showCircleRuler={showCircleRuler}
          />

          {/* サンプル選手マーカー */}
          {showSamplePlayers && (
            <div className="absolute inset-0 pointer-events-none z-10">
              {SAMPLE_PLAYERS_H.map((player) => {
                const normX = isHorizontal ? player.x : player.y;
                const normY = isHorizontal ? player.y : 100 - player.x;

                // 5%余白の内側に配置
                const leftPercent =
                  (marginRatio + (normX / 100) * usableRatio) * 100;
                const topPercent =
                  (marginRatio + (normY / 100) * usableRatio) * 100;

                return (
                  <div
                    key={player.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-all duration-300"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                    }}
                  >
                    <div
                      className="size-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md border-2 border-slate-900"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.num}
                    </div>
                    <span className="text-[9px] font-medium text-slate-300 drop-shadow-sm px-1 rounded bg-black/60 mt-0.5">
                      {player.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── 境界線インジケーター (PNG切り取り指標: no-export のためPNGには一切映らない) ─── */}
          <div className="no-export absolute inset-0 pointer-events-none border-2 border-cyan-400 shadow-[0_0_24px_rgba(56,189,248,0.3)] z-20">
            {/* クロップガイドコーナー */}
            <div className="absolute -top-[2px] -left-[2px] size-3 border-t-2 border-l-2 border-white" />
            <div className="absolute -top-[2px] -right-[2px] size-3 border-t-2 border-r-2 border-white" />
            <div className="absolute -bottom-[2px] -left-[2px] size-3 border-b-2 border-l-2 border-white" />
            <div className="absolute -bottom-[2px] -right-[2px] size-3 border-b-2 border-r-2 border-white" />
          </div>

          {/* 境界線ラベルバッジ (キャプチャ時除外マーク) */}
          <div className="no-export absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900/90 text-cyan-300 border border-cyan-500/40 shadow-md pointer-events-none z-20">
            <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>切り取り指標: {config.id}</span>
            <span className="text-slate-400">余白 {marginPercent}%</span>
          </div>
        </div>
      </div>

      {/* 画面右下の操作ガイドHUD */}
      <div className="absolute bottom-3 right-3 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs text-slate-400 flex items-center gap-3 pointer-events-none z-20">
        <span>🖱️ ホイール: ズーム</span>
        <span>✋ ドラッグ: 移動</span>
        <span className="text-cyan-400 font-mono">
          Zoom: {Math.round(zoom * 100)}%
        </span>
        {tilt > 0 && (
          <span className="text-purple-400 font-mono">Tilt: {tilt}°</span>
        )}
      </div>
    </div>
  );
}
