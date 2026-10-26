'use client';

import type React from 'react';
import { useMemo } from 'react';
import { Layer, Line, Rect, Stage } from 'react-konva';
import { usePilotStore } from '@/stores/pilotStore';

export interface PilotCanvasProps {
  /** キャンバスの幅 (px) デフォルト: 600 */
  width?: number;
  /** キャンバスの高さ (px) デフォルト: 400 */
  height?: number;
  /** コンテナ要素のCSSクラス名 */
  className?: string;
}

const RECT_SIZE = 200;
const GRID_STEP = 10;

/**
 * PilotCanvas コンポーネント
 *
 * Konva 10 / React 19 ベストプラクティスに準拠:
 * - レイヤー分離 (グリッド用レイヤーとコンテンツ用レイヤーを分離)
 * - 非インタラクティブなグリッドレイヤーに listening={false} を指定し Hit Canvas 生成を抑止
 * - perfectDrawEnabled={false} による不要なオフスクリーンバッファ描画のスキップ
 * - usePilotStore から showGrid を取得し、グリッドの描画をリアクティブに切り替え
 */
export function PilotCanvas({
  width = 600,
  height = 400,
  className,
}: PilotCanvasProps) {
  const showGrid = usePilotStore((state) => state.showGrid);

  // 中央配置の四角形座標
  const rectX = useMemo(() => (width - RECT_SIZE) / 2, [width]);
  const rectY = useMemo(() => (height - RECT_SIZE) / 2, [height]);

  // 10px間隔の格子状グリッド線 (showGrid === true 時のみ計算)
  const gridLines = useMemo(() => {
    if (!showGrid) return null;

    const lines: React.ReactElement[] = [];

    // 垂直線
    for (let x = 0; x <= width; x += GRID_STEP) {
      lines.push(
        <Line
          key={`v-${x}`}
          points={[x, 0, x, height]}
          stroke="#e2e8f0"
          strokeWidth={1}
          listening={false}
          perfectDrawEnabled={false}
        />,
      );
    }

    // 水平線
    for (let y = 0; y <= height; y += GRID_STEP) {
      lines.push(
        <Line
          key={`h-${y}`}
          points={[0, y, width, y]}
          stroke="#e2e8f0"
          strokeWidth={1}
          listening={false}
          perfectDrawEnabled={false}
        />,
      );
    }

    return lines;
  }, [showGrid, width, height]);

  return (
    <div className={className} data-testid="pilot-canvas-container">
      <Stage width={width} height={height}>
        {/* 背景グリッドレイヤー: listening={false} でHitキャンバスメモリを解放 */}
        {showGrid && (
          <Layer id="grid-layer" name="grid-layer" listening={false}>
            {gridLines}
          </Layer>
        )}

        {/* メインレイヤー: 中央 200x200 の四角形 */}
        <Layer id="main-layer" name="main-layer">
          <Rect
            id="center-rect"
            name="center-rect"
            x={rectX}
            y={rectY}
            width={RECT_SIZE}
            height={RECT_SIZE}
            fill="#3b82f6"
            stroke="#1d4ed8"
            strokeWidth={2}
            perfectDrawEnabled={false}
          />
        </Layer>
      </Stage>
    </div>
  );
}

export default PilotCanvas;
