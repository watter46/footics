'use client';

/**
 * unified-canvas.tsx
 * Central canvas orchestrator — Konva Stage + Pitch + BoundaryBox + Objects
 *
 * Store アクセス: use-unified-canvas-state.ts
 * イベントリスナー: use-canvas-event-listeners.ts
 * アニメーション: use-tactical-animation.ts
 */

import type Konva from 'konva';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, Layer, Rect, Stage } from 'react-konva';
import { useKonvaExport } from '@/features/tactical-unified/hooks/use-konva-export';
import { useKonvaVideoExport } from '@/features/tactical-unified/hooks/use-konva-video-export';
import { useTacticalAnimation } from '@/features/tactical-unified/hooks/use-tactical-animation';
import { PlayerLayer } from '../../objects/player';
import { ContextHud } from '../../panels/hud';
import { BoundaryBoxHud, DrawingToolbar } from '../../panels/toolbar';
import { AnnotationLayer } from './annotation-layer';
import { BallObject } from '../../objects/ball';
import { BoundaryBox } from './boundary-box';
import { DrawingPreviewLayer } from './drawing-preview-layer';
import {
  calculatePitchRect,
  calculatePitchTransform,
  createCanvasNodesRegistry,
} from './helpers';
import { useCanvasEventListeners, useCanvasPointerInteraction } from './hooks';
import { PitchBackground } from './pitch-background';
import { PitchInlineTextEditor } from './pitch-inline-text-editor';
import { useUnifiedCanvasState } from './use-unified-canvas-state';

export { normToPx, pxToNorm } from './hooks';

export function UnifiedCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const nodesRegistryRef = useRef(createCanvasNodesRegistry());
  const [stageSize, setStageSize] = useState({ width: 800, height: 450 });
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const {
    aspectRatio,
    backgroundType,
    backgroundImageUrl,
    activeSlideId,
    activeSlide,
    clearSelection,
    activeTool,
    connectingPlayerId,
    setActiveSlide,
    setBackgroundImageUrl,
    setBackgroundType,
    isExporting,
    setIsExporting,
    isPlaying,
    updateText,
    removeText,
    setBoundaryBox,
  } = useUnifiedCanvasState();

  const editingText = editingTextId
    ? (activeSlide?.texts.find((t) => t.id === editingTextId) ?? null)
    : null;

  const pitchRect = useMemo(
    () => calculatePitchRect(stageSize, aspectRatio),
    [aspectRatio, stageSize.width, stageSize.height],
  );

  const pitchSize = useMemo(
    () => ({ width: pitchRect.width, height: pitchRect.height }),
    [pitchRect.width, pitchRect.height],
  );

  const pitchGroupsRef = useRef<(Konva.Group | null)[]>([]);

  const pitchTransform = activeSlide?.pitchTransform ?? {
    panX: 0,
    panY: 0,
    zoom: 1,
    tilt: 0,
    isLocked: false,
  };
  const panX = pitchTransform.panX ?? 0;
  const panY = pitchTransform.panY ?? 0;
  const zoom = pitchTransform.zoom ?? 1;
  const tilt = pitchTransform.tilt ?? 0;

  const pitchTransformValues = useMemo(
    () => calculatePitchTransform(pitchRect, panX, panY, zoom, tilt),
    [pitchRect, panX, panY, zoom, tilt],
  );

  const {
    drawingState,
    selectionBox,
    activePolygonId,
    mousePreviewPos,
    isPitchLocked,
    isPanning,
    isSpacePressed,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useCanvasPointerInteraction({
    stageSize,
    pitchRect,
    activeSlide,
    activeSlideId,
    containerRef,
    nodesRegistryRef,
    pitchGroupsRef,
    editingTextId,
    setEditingTextId,
  });

  const { playAnimation, pauseAnimation, applyFrameToCanvas } =
    useTacticalAnimation({ nodesRegistryRef, pitchSize });

  // 再生状態の同期
  useEffect(() => {
    if (isPlaying) {
      playAnimation();
    } else {
      pauseAnimation();
    }
  }, [isPlaying, playAnimation, pauseAnimation]);

  const { copyToClipboard, runExport } = useKonvaExport({
    stageRef,
    activateSlide: async (slideId) => {
      setActiveSlide(slideId);
      await new Promise((r) => setTimeout(r, 100));
    },
  });

  const { exportVideo } = useKonvaVideoExport({
    stageRef,
    nodesRegistryRef,
    applyFrameToCanvas,
  });

  // コンテナリサイズ → Stage サイズ更新
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateStageSize = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      setStageSize({ width: Math.floor(width), height: Math.floor(height) });
    };
    updateStageSize();
    const observer = new ResizeObserver(updateStageSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ウィンドウイベントリスナー群
  useCanvasEventListeners({
    setBackgroundImageUrl,
    setBackgroundType,
    setIsExporting,
    copyToClipboard,
    runExport,
    exportVideo,
  });

  if (!activeSlide) return null;

  const cursorStyle = connectingPlayerId
    ? 'crosshair'
    : isPanning
      ? 'grabbing'
      : isSpacePressed
        ? 'grab'
        : activeTool === 'select'
          ? isPitchLocked
            ? 'default'
            : 'grab'
          : activeTool === 'eraser'
            ? 'pointer'
            : 'crosshair';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-[#0a0a0a] overflow-hidden"
    >
      <div className="relative w-full h-full">
        <Stage
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={(node: any) => {
            stageRef.current = node;
            nodesRegistryRef.current.stage = node;
          }}
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onWheel={handleWheel}
          style={{ cursor: cursorStyle }}
        >
          {/* Layer 1: 背景レイヤー */}
          <Layer
            listening={false}
            ref={(node) => {
              nodesRegistryRef.current.backgroundLayer = node;
            }}
          >
            <Rect
              x={0}
              y={0}
              width={stageSize.width}
              height={stageSize.height}
              fill="#0a0a0a"
              listening={false}
            />
            <Group
              x={pitchTransformValues.x}
              y={pitchTransformValues.y}
              scaleX={pitchTransformValues.scaleX}
              scaleY={pitchTransformValues.scaleY}
              ref={(node) => {
                pitchGroupsRef.current[0] = node;
              }}
            >
              <PitchBackground
                width={pitchRect.width}
                height={pitchRect.height}
                aspectRatio={aspectRatio}
                backgroundType={backgroundType}
                backgroundImageUrl={backgroundImageUrl}
              />
            </Group>
          </Layer>

          {/* Layer 2: アノテーションレイヤー */}
          <Layer
            ref={(node) => {
              nodesRegistryRef.current.annotationLayer = node;
            }}
          >
            <Group
              x={pitchTransformValues.x}
              y={pitchTransformValues.y}
              scaleX={pitchTransformValues.scaleX}
              scaleY={pitchTransformValues.scaleY}
              ref={(node) => {
                pitchGroupsRef.current[1] = node;
              }}
            >
              <AnnotationLayer
                slide={activeSlide}
                stageSize={pitchSize}
                nodesRegistryRef={nodesRegistryRef}
                activePolygonId={activePolygonId}
                mousePreviewPos={mousePreviewPos}
                editingTextId={editingTextId}
                onStartEditText={(textId) => setEditingTextId(textId)}
              />
            </Group>
          </Layer>

          {/* Layer 3: 選手 + ボールレイヤー */}
          <Layer
            ref={(node) => {
              nodesRegistryRef.current.playerLayer = node;
              nodesRegistryRef.current.ballLayer = node;
            }}
          >
            <Group
              x={pitchTransformValues.x}
              y={pitchTransformValues.y}
              scaleX={pitchTransformValues.scaleX}
              scaleY={pitchTransformValues.scaleY}
              ref={(node) => {
                pitchGroupsRef.current[2] = node;
              }}
            >
              <PlayerLayer
                slide={activeSlide}
                stageSize={pitchSize}
                nodesRegistryRef={nodesRegistryRef}
              />
              <BallObject
                ball={activeSlide.ball}
                stageSize={pitchSize}
                nodesRegistryRef={nodesRegistryRef}
              />
            </Group>
          </Layer>

          {/* Layer 4: UI & プレビューレイヤー */}
          <Layer>
            <Group
              x={pitchTransformValues.x}
              y={pitchTransformValues.y}
              scaleX={pitchTransformValues.scaleX}
              scaleY={pitchTransformValues.scaleY}
              ref={(node) => {
                pitchGroupsRef.current[3] = node;
              }}
            >
              <DrawingPreviewLayer
                drawingState={drawingState}
                selectionBox={null}
              />
              <DrawingPreviewLayer
                drawingState={null}
                selectionBox={selectionBox}
              />
            </Group>
            <BoundaryBox
              boundaryBox={activeSlide.boundaryBox}
              stageSize={stageSize}
              pitchRect={pitchRect}
              isExporting={isExporting}
              onUpdate={(box) => setBoundaryBox(activeSlideId, box)}
            />
          </Layer>
        </Stage>

        <DrawingToolbar />
        <ContextHud
          stageSize={stageSize}
          pitchRect={pitchRect}
          nodesRegistryRef={nodesRegistryRef}
        />
        <BoundaryBoxHud stageSize={stageSize} pitchRect={pitchRect} />

        <PitchInlineTextEditor
          editingText={editingText}
          stageSize={stageSize}
          pitchRect={pitchRect}
          pitchTransform={pitchTransform}
          onSave={(textId, content) => {
            updateText(activeSlideId, textId, { content });
          }}
          onRemove={(textId) => {
            removeText(activeSlideId, textId);
            clearSelection();
          }}
          onClose={() => setEditingTextId(null)}
        />
      </div>
    </div>
  );
}
