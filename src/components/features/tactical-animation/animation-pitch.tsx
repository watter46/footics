'use client';

import type Konva from 'konva';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image as KonvaImage, Layer, Line, Rect, Stage } from 'react-konva';
import { calculateBezierPoint } from '@/lib/tactical/trajectory';
import { useTacticalAnimationStore } from '@/stores/tactical-animation-store';
import { AnimationMarker } from './animation-marker';

const horizontalPitchSvg = `<svg viewBox="-1 -1 107 70" xmlns="http://www.w3.org/2000/svg">
  <rect x="-1" y="-1" width="107" height="70" fill="#020617" />
  <rect x="0" y="0" width="105" height="68" fill="#020617" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <line x1="52.5" y1="0" x2="52.5" y2="68" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="52.5" cy="34" r="0.4" fill="#e2b48d" opacity="0.8"/>
  <rect x="0" y="13.85" width="16.5" height="40.3" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="0" y="24.85" width="5.5" height="18.3" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="11" cy="34" r="0.3" fill="#e2b48d" opacity="0.8"/>
  <path d="M 16.5 26.69 A 9.15 9.15 0 0 1 16.5 41.31" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="88.5" y="13.85" width="16.5" height="40.3" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="99.5" y="24.85" width="5.5" height="18.3" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="94" cy="34" r="0.3" fill="#e2b48d" opacity="0.8"/>
  <path d="M 88.5 26.69 A 9.15 9.15 0 0 0 88.5 41.31" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
</svg>`;

const verticalPitchSvg = `<svg viewBox="-1 -1 70 107" xmlns="http://www.w3.org/2000/svg">
  <rect x="-1" y="-1" width="70" height="107" fill="#020617" />
  <rect x="0" y="0" width="68" height="105" fill="#020617" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <line x1="0" y1="52.5" x2="68" y2="52.5" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="34" cy="52.5" r="9.15" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="34" cy="52.5" r="0.4" fill="#e2b48d" opacity="0.8"/>
  <rect x="13.85" y="0" width="40.3" height="16.5" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="24.85" y="0" width="18.3" height="5.5" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="34" cy="11" r="0.3" fill="#e2b48d" opacity="0.8"/>
  <path d="M 26.69 16.5 A 9.15 9.15 0 0 0 41.31 16.5" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="13.85" y="88.5" width="40.3" height="16.5" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="24.85" y="99.5" width="18.3" height="5.5" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="34" cy="94" r="0.3" fill="#e2b48d" opacity="0.8"/>
  <path d="M 26.69 88.5 A 9.15 9.15 0 0 1 41.31 88.5" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
</svg>`;

interface AnimationPitchProps {
  width: number;
  height: number;
}

export interface AnimationPitchRef {
  getStage: () => Konva.Stage | null;
  getCanvas: () => HTMLCanvasElement | null;
}

export const AnimationPitch = forwardRef<
  AnimationPitchRef,
  AnimationPitchProps
>(({ width, height }, ref) => {
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const [pitchImage, setPitchImage] = useState<HTMLImageElement | null>(null);

  const orientation = useTacticalAnimationStore((s) => s.orientation);
  const activeSceneIndex = useTacticalAnimationStore((s) => s.activeSceneIndex);
  const scenes = useTacticalAnimationStore((s) => s.scenes);
  const isPlaying = useTacticalAnimationStore((s) => s.isPlaying);
  const selectedPlayerId = useTacticalAnimationStore((s) => s.selectedPlayerId);
  const setSelectedPlayerId = useTacticalAnimationStore(
    (s) => s.setSelectedPlayerId,
  );
  const updatePlayerPosition = useTacticalAnimationStore(
    (s) => s.updatePlayerPosition,
  );
  const updateBallPosition = useTacticalAnimationStore(
    (s) => s.updateBallPosition,
  );

  // ピッチSVGのロード
  useEffect(() => {
    const svgString =
      orientation === 'vertical' ? verticalPitchSvg : horizontalPitchSvg;
    const img = new window.Image();
    const svg = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svg);
    img.src = url;
    img.onload = () => {
      setPitchImage(img);
    };
    return () => URL.revokeObjectURL(url);
  }, [orientation]);

  useImperativeHandle(ref, () => ({
    getStage: () => stageRef.current,
    getCanvas: () => {
      if (!stageRef.current) return null;
      // Konvaの単一レイヤーから実際のCanvas要素を取得 (captureStream用)
      const container = stageRef.current.container();
      const canvas = container.querySelector('canvas');
      if (canvas) return canvas;
      const layer = stageRef.current.getLayers()[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (layer?.getCanvas() as any)?._canvas || null;
    },
  }));

  const activeScene = scenes[activeSceneIndex];

  // 選択中選手の移動軌道プレビュー線の計算 (次シーンへの移動がある場合)
  const trajectoryPoints = useMemo(() => {
    if (!selectedPlayerId || isPlaying) return null;

    const currentScene = scenes[activeSceneIndex];
    const nextScene = scenes[activeSceneIndex + 1];
    if (!currentScene || !nextScene) return null;

    const p0 = currentScene.players[selectedPlayerId];
    const p1 = nextScene.players[selectedPlayerId];
    if (!p0 || !p1 || p0.area !== 'pitch' || p1.area !== 'pitch') return null;

    // 移動距離がほぼゼロなら描画しない
    if (Math.abs(p0.x - p1.x) < 0.5 && Math.abs(p0.y - p1.y) < 0.5) return null;

    const pts: number[] = [];
    const steps = 24; // 24分割で滑らかなカーブ
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pos = calculateBezierPoint(
        { x: p0.x, y: p0.y },
        { x: p1.x, y: p1.y },
        t,
        p1.trajectory,
      );
      pts.push((pos.x / 100) * width, (pos.y / 100) * height);
    }

    return pts;
  }, [selectedPlayerId, isPlaying, scenes, activeSceneIndex, width, height]);

  if (!activeScene) return null;

  return (
    <div className="relative flex items-center justify-center select-none shadow-2xl rounded-xl overflow-hidden border-2 border-slate-700 bg-slate-950">
      <Stage
        width={width}
        height={height}
        ref={stageRef}
        onMouseDown={(e) => {
          // 背景クリックで選択解除
          if (
            e.target === e.target.getStage() ||
            e.target.className === 'Image' ||
            e.target.className === 'Rect'
          ) {
            setSelectedPlayerId(null);
          }
        }}
        onTouchStart={(e) => {
          if (
            e.target === e.target.getStage() ||
            e.target.className === 'Image' ||
            e.target.className === 'Rect'
          ) {
            setSelectedPlayerId(null);
          }
        }}
      >
        {/* 単一Layer構成で高パフォーマンス & ピッチ境界内へのクリッピング */}
        <Layer
          ref={layerRef}
          clip={{
            x: 0,
            y: 0,
            width,
            height,
          }}
        >
          {/* 100% 完全不透明なソリッド黒背景（動画エンコード時の透過色化け防止） */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="#020617"
            perfectDrawEnabled={false}
          />

          {pitchImage && (
            <KonvaImage
              image={pitchImage}
              width={width}
              height={height}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}

          {/* 選択選手の移動軌道ガイド線 */}
          {trajectoryPoints && trajectoryPoints.length > 0 && (
            <Line
              points={trajectoryPoints}
              stroke="#38bdf8"
              strokeWidth={2.5}
              dash={[6, 4]}
              opacity={0.85}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}

          {/* ピッチ上の選手マーカー */}
          {Object.values(activeScene.players).map((p) => {
            if (p.area === 'bench') return null;

            return (
              <AnimationMarker
                key={p.playerId}
                id={p.playerId}
                x={p.x}
                y={p.y}
                color={p.options.color}
                name={p.name}
                shirtNo={p.shirtNo}
                options={p.options}
                stageWidth={width}
                stageHeight={height}
                isSelected={selectedPlayerId === p.playerId}
                draggable={!isPlaying}
                onClick={(id) => setSelectedPlayerId(id)}
                onDragEnd={(id, newX, newY) => {
                  updatePlayerPosition(activeSceneIndex, id, newX, newY);
                }}
              />
            );
          })}

          {/* ボールマーカー */}
          <AnimationMarker
            id="ball"
            x={activeScene.ballPos.x}
            y={activeScene.ballPos.y}
            color="#f97316"
            name="BALL"
            shirtNo=""
            options={{
              insideContent: 'none',
              bottomLabel: 'none',
              color: '#f97316',
            }}
            stageWidth={width}
            stageHeight={height}
            isSelected={selectedPlayerId === 'ball'}
            isBall
            draggable={!isPlaying}
            onClick={(id) => setSelectedPlayerId(id)}
            onDragEnd={(_, newX, newY) => {
              updateBallPosition(activeSceneIndex, newX, newY);
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
});

AnimationPitch.displayName = 'AnimationPitch';
