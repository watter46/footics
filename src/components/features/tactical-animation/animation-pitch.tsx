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
import {
  Arrow,
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
} from 'react-konva';
import {
  calculateBezierPoint,
  getBezierControlPoint,
  type PlayerTrajectory,
  type Point2D,
} from '@/lib/tactical/trajectory';
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
  readOnly?: boolean;
}

export interface AnimationPitchRef {
  getStage: () => Konva.Stage | null;
  getCanvas: () => HTMLCanvasElement | null;
}

export const AnimationPitch = forwardRef<
  AnimationPitchRef,
  AnimationPitchProps
>(({ width, height, readOnly = false }, ref) => {
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const [pitchImage, setPitchImage] = useState<HTMLImageElement | null>(null);

  // 矩形範囲選択（ラバーバンド）用のステート
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const orientation = useTacticalAnimationStore((s) => s.orientation);
  const teamVisibility = useTacticalAnimationStore((s) => s.teamVisibility);
  const activeSceneIndex = useTacticalAnimationStore((s) => s.activeSceneIndex);
  const scenes = useTacticalAnimationStore((s) => s.scenes);
  const isPlaying = useTacticalAnimationStore((s) => s.isPlaying);
  const selectedPlayerId = useTacticalAnimationStore((s) => s.selectedPlayerId);
  const selectedPlayerIds = useTacticalAnimationStore(
    (s) => s.selectedPlayerIds,
  );
  const setSelectedPlayerId = useTacticalAnimationStore(
    (s) => s.setSelectedPlayerId,
  );
  const setSelectedPlayerIds = useTacticalAnimationStore(
    (s) => s.setSelectedPlayerIds,
  );
  const toggleSelectPlayerId = useTacticalAnimationStore(
    (s) => s.toggleSelectPlayerId,
  );
  const clearSelection = useTacticalAnimationStore((s) => s.clearSelection);
  const updatePlayerPosition = useTacticalAnimationStore(
    (s) => s.updatePlayerPosition,
  );
  const moveMultiplePlayersByDelta = useTacticalAnimationStore(
    (s) => s.moveMultiplePlayersByDelta,
  );
  const updateBallPosition = useTacticalAnimationStore(
    (s) => s.updateBallPosition,
  );
  const updatePlayerTrajectory = useTacticalAnimationStore(
    (s) => s.updatePlayerTrajectory,
  );
  const updateBallTrajectory = useTacticalAnimationStore(
    (s) => s.updateBallTrajectory,
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
      const container = stageRef.current.container();
      const canvas = container.querySelector('canvas');
      if (canvas) return canvas;
      const layer = stageRef.current.getLayers()[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (layer?.getCanvas() as any)?._canvas || null;
    },
  }));

  const activeScene = scenes[activeSceneIndex];

  // 選択中（選手またはボール）の移動軌道ガイドデータの計算
  // activeSceneIndex >= 1 (シーン2以降) の場合: 直前シーン (i-1) -> 現在シーン (i) の軌道を表示・編集
  // activeSceneIndex === 0 (先頭シーン) の場合: 現在シーン (0) -> 次シーン (1) の軌道を表示・編集
  const trajectoryGuide = useMemo(() => {
    if (!selectedPlayerId || isPlaying || scenes.length <= 1) return null;

    let fromSceneIdx = 0;
    let toSceneIdx = 1;
    let targetTrajectorySceneIdx = 1;

    if (activeSceneIndex >= 1) {
      fromSceneIdx = activeSceneIndex - 1;
      toSceneIdx = activeSceneIndex;
      targetTrajectorySceneIdx = activeSceneIndex;
    } else {
      fromSceneIdx = 0;
      toSceneIdx = 1;
      targetTrajectorySceneIdx = 1;
    }

    const fromScene = scenes[fromSceneIdx];
    const toScene = scenes[toSceneIdx];
    if (!fromScene || !toScene) return null;

    let p0: Point2D | null = null;
    let p1: Point2D | null = null;
    let trajectory: PlayerTrajectory | undefined;
    let isBall = false;

    if (selectedPlayerId === 'ball') {
      isBall = true;
      p0 = fromScene.ballPos;
      p1 = toScene.ballPos;
      trajectory = toScene.ballTrajectory || fromScene.ballTrajectory;
    } else {
      const pl0 = fromScene.players[selectedPlayerId];
      const pl1 = toScene.players[selectedPlayerId];
      if (pl0 && pl1 && pl0.area === 'pitch' && pl1.area === 'pitch') {
        p0 = { x: pl0.x, y: pl0.y };
        p1 = { x: pl1.x, y: pl1.y };
        trajectory = pl1.trajectory || pl0.trajectory;
      }
    }

    if (!p0 || !p1) return null;

    // 移動距離がほぼゼロ（0.5%未満）なら描画しない
    const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    if (dist < 0.5) return null;

    // 2次ベジェ制御点を計算
    const cp = getBezierControlPoint(p0, p1, trajectory);

    const pts: number[] = [];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pos = calculateBezierPoint(p0, p1, t, trajectory);
      pts.push((pos.x / 100) * width, (pos.y / 100) * height);
    }

    return {
      isBall,
      targetSceneIndex: targetTrajectorySceneIdx,
      points: pts,
      controlPoint: {
        x: (cp.x / 100) * width,
        y: (cp.y / 100) * height,
      },
      trajectoryType: trajectory?.type || 'straight',
      color: isBall ? '#fbbf24' : '#38bdf8',
    };
  }, [selectedPlayerId, isPlaying, scenes, activeSceneIndex, width, height]);

  // 制御点（曲げポインター）のドラッグハンドラー
  const handleControlPointDrag = (pos: { x: number; y: number }) => {
    if (!selectedPlayerId || !trajectoryGuide || readOnly) return;
    const normX = Math.max(0, Math.min(100, (pos.x / width) * 100));
    const normY = Math.max(0, Math.min(100, (pos.y / height) * 100));

    if (selectedPlayerId === 'ball') {
      updateBallTrajectory(
        {
          type: 'custom',
          controlPoint: { x: normX, y: normY },
        },
        false,
        trajectoryGuide.targetSceneIndex,
      );
    } else {
      updatePlayerTrajectory(
        selectedPlayerId,
        {
          type: 'custom',
          controlPoint: { x: normX, y: normY },
        },
        false,
        trajectoryGuide.targetSceneIndex,
      );
    }
  };



  // 背景クリック・ドラッグ開始（範囲選択）
  const handleStageMouseDown = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    e: any,
  ) => {
    if (isPlaying || readOnly) return;
    const isBackground =
      e.target === e.target.getStage() ||
      e.target.className === 'Image' ||
      e.target.className === 'Rect';

    if (isBackground) {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;

      const isShift = e.evt?.shiftKey;
      if (!isShift) {
        clearSelection();
      }

      setSelectionBox({
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
      });
    }
  };

  const handleStageMouseMove = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    e: any,
  ) => {
    if (!selectionBox || isPlaying || readOnly) return;
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    setSelectionBox((prev) =>
      prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null,
    );
  };

  const handleStageMouseUp = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    e: any,
  ) => {
    if (!selectionBox || isPlaying || readOnly) {
      setSelectionBox(null);
      return;
    }

    const { startX, startY, currentX, currentY } = selectionBox;
    const dx = Math.abs(currentX - startX);
    const dy = Math.abs(currentY - startY);

    // 単なるクリック（5px未満）の場合は終了
    if (dx < 5 && dy < 5) {
      setSelectionBox(null);
      return;
    }

    const minPxX = Math.min(startX, currentX);
    const maxPxX = Math.max(startX, currentX);
    const minPxY = Math.min(startY, currentY);
    const maxPxY = Math.max(startY, currentY);

    const minX = (minPxX / width) * 100;
    const maxX = (maxPxX / width) * 100;
    const minY = (minPxY / height) * 100;
    const maxY = (maxPxY / height) * 100;

    // 範囲内に含まれるピッチ選手マーカーを抽出
    if (activeScene) {
      const selected = Object.values(activeScene.players)
        .filter((p) => {
          if (p.area !== 'pitch') return false;
          return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
        })
        .map((p) => p.playerId);

      const isShift = e.evt?.shiftKey;
      if (isShift) {
        const combined = Array.from(
          new Set([...selectedPlayerIds, ...selected]),
        );
        setSelectedPlayerIds(combined);
      } else {
        setSelectedPlayerIds(selected);
      }
    }

    setSelectionBox(null);
  };

  if (!activeScene) return null;

  return (
    <div className="relative flex items-center justify-center select-none shadow-2xl rounded-xl overflow-hidden border-2 border-slate-700 bg-slate-950">
      <Stage
        width={width}
        height={height}
        ref={stageRef}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchStart={handleStageMouseDown}
        onTouchMove={handleStageMouseMove}
        onTouchEnd={handleStageMouseUp}
      >
        {/* 1. 静的背景レイヤー (リスニング無効でドラッグ中も完全ゼロ負荷) */}
        <Layer
          listening={false}
          clip={{
            x: 0,
            y: 0,
            width,
            height,
          }}
        >
          {/* 100% 完全不透明なソリッド黒背景 */}
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
        </Layer>

        {/* 2. 動的マーカー・操作レイヤー (高FPSでスムーズにドラッグ) */}
        <Layer
          ref={layerRef}
          clip={{
            x: 0,
            y: 0,
            width,
            height,
          }}
        >
          {/* 選択選手・ボールの移動軌道ガイド矢印 & 曲げポインター */}
          {trajectoryGuide && trajectoryGuide.points.length > 0 && (
            <Group>
              <Arrow
                points={trajectoryGuide.points}
                stroke={trajectoryGuide.color}
                fill={trajectoryGuide.color}
                strokeWidth={2.5}
                dash={[6, 4]}
                opacity={0.85}
                pointerLength={12}
                pointerWidth={12}
                tension={0}
                listening={false}
                perfectDrawEnabled={false}
              />

              {/* カスタム制御点曲げポインター (オレンジの丸ハンドル) */}
              {!readOnly && trajectoryGuide.trajectoryType === 'custom' && (
                <Circle
                  x={trajectoryGuide.controlPoint.x}
                  y={trajectoryGuide.controlPoint.y}

                  radius={7}
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth={2}
                  shadowColor="#000000"
                  shadowBlur={4}
                  shadowOpacity={0.5}
                  draggable={!isPlaying && !readOnly}
                  dragBoundFunc={(pos) => ({
                    x: Math.max(0, Math.min(width, pos.x)),
                    y: Math.max(0, Math.min(height, pos.y)),
                  })}
                  onDragMove={(e) => {
                    handleControlPointDrag(e.target.position());
                  }}
                  onDragEnd={(e) => {
                    handleControlPointDrag(e.target.position());
                  }}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'grab';
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                  }}
                />
              )}
            </Group>
          )}


          {/* ピッチ上の選手マーカー */}
          {Object.values(activeScene.players).map((p) => {
            if (p.area === 'bench') return null;
            if (teamVisibility !== 'both' && p.team !== teamVisibility)
              return null;

            const isSelected =
              selectedPlayerIds.includes(p.playerId) ||
              selectedPlayerId === p.playerId;

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
                isSelected={!readOnly && isSelected}
                draggable={!isPlaying && !readOnly}
                onClick={(id, e: any) => {
                  if (readOnly) return;
                  if (e?.evt?.shiftKey) {
                    toggleSelectPlayerId(id, true);
                  } else {
                    setSelectedPlayerId(id);
                  }
                }}
                onDragEnd={(id, newX, newY) => {
                  if (readOnly) return;
                  const origP = activeScene.players[id];
                  if (!origP) return;

                  const deltaX = newX - origP.x;
                  const deltaY = newY - origP.y;

                  // 複数選手が選択されており、ドラッグ対象が含まれている場合はまとめて連動移動
                  if (
                    selectedPlayerIds.includes(id) &&
                    selectedPlayerIds.length > 1
                  ) {
                    moveMultiplePlayersByDelta(
                      activeSceneIndex,
                      selectedPlayerIds,
                      deltaX,
                      deltaY,
                    );
                  } else {
                    updatePlayerPosition(activeSceneIndex, id, newX, newY);
                  }
                }}
              />
            );
          })}

          {/* ボールマーカー */}
          <AnimationMarker
            id="ball"
            x={activeScene.ballPos.x}
            y={activeScene.ballPos.y}
            color="#ffffff"
            name="BALL"
            shirtNo=""
            options={{
              insideContent: 'none',
              bottomLabel: 'none',
              color: '#ffffff',
            }}
            stageWidth={width}
            stageHeight={height}
            isSelected={
              !readOnly &&
              (selectedPlayerId === 'ball' ||
                selectedPlayerIds.includes('ball'))
            }
            isBall
            draggable={!isPlaying && !readOnly}
            onClick={(id) => {
              if (readOnly) return;
              setSelectedPlayerId(id);
            }}
            onDragEnd={(_, newX, newY) => {
              if (readOnly) return;
              updateBallPosition(activeSceneIndex, newX, newY);
            }}
          />

          {/* 矩形ドラッグ範囲選択ボックス (ラバーバンド) */}
          {selectionBox && (
            <Rect
              x={Math.min(selectionBox.startX, selectionBox.currentX)}
              y={Math.min(selectionBox.startY, selectionBox.currentY)}
              width={Math.abs(selectionBox.currentX - selectionBox.startX)}
              height={Math.abs(selectionBox.currentY - selectionBox.startY)}
              fill="rgba(56, 189, 248, 0.15)"
              stroke="#38bdf8"
              strokeWidth={1.5}
              dash={[5, 3]}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
});

AnimationPitch.displayName = 'AnimationPitch';
