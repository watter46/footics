// biome-ignore lint/style/noExcessiveLinesPerFile: Canvas orchestrator coordinates Konva stages, layers, overlays, and editors
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
import { Group, Layer, Stage } from 'react-konva';
import { useKonvaExport } from '@/features/tactical-unified/hooks/use-konva-export';
import { useKonvaVideoExport } from '@/features/tactical-unified/hooks/use-konva-video-export';
import { useTacticalAnimation } from '@/features/tactical-unified/hooks/use-tactical-animation';
import { BallObject } from '@/features/tactical-unified/objects/ball';
import { PitchInlineTextEditor } from '@/features/tactical-unified/objects/pitch';
import { PitchBackgroundDom } from '@/features/tactical-unified/objects/pitch/components/pitch-background-dom';
import { PlayerLayer } from '@/features/tactical-unified/objects/player';
import { ContextHud } from '@/features/tactical-unified/panels/hud';
import {
  BoundaryBoxHud,
  DrawingToolbar,
} from '@/features/tactical-unified/panels/toolbar';
import { usePitchTransition } from '@/features/tactical-unified/stores/slide-aspect-helpers';
import {
  calculatePitchRect,
  calculatePitchTransform,
  createCanvasNodesRegistry,
} from '../helpers';
import {
  useCanvasEventListeners,
  useCanvasPointerInteraction,
  useUnifiedCanvasState,
} from '../hooks';
import { AnnotationLayer } from './annotation-layer';
import { BoundaryBox } from './boundary-box';
import { DrawingPreviewLayer } from './drawing-preview-layer';

export { normToPx, pxToNorm } from '../hooks';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Canvas orchestrator coordinates Konva stages, overlays, and editors
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Canvas orchestrator coordinates Konva stages, overlays, and editors
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
    updateBoundaryBox,
  } = useUnifiedCanvasState();

  const editingText = editingTextId
    ? (activeSlide?.texts.find((t) => t.id === editingTextId) ?? null)
    : null;

  const pitchRect = useMemo(
    () => calculatePitchRect(stageSize, aspectRatio),
    [aspectRatio, stageSize],
  );

  const { effectivePitchRect, effectiveSlide, effectivePitchSize } =
    usePitchTransition({
      aspectRatio,
      activeSlideId,
      activeSlide,
      pitchRect,
      isExporting,
    });

  const pitchGroupsRef = useRef<(Konva.Group | null)[]>([]);

  const pitchTransform = effectiveSlide?.pitchTransform ?? {
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
    // tilt は CSS 3D (rotateX) 側で処理するため Konva には渡さない
    () => calculatePitchTransform(effectivePitchRect, panX, panY, zoom, 0),
    [effectivePitchRect, panX, panY, zoom],
  );

  const transformedPitchRect = useMemo(
    () => ({
      x: pitchTransformValues.x,
      y: pitchTransformValues.y,
      width: effectivePitchRect.width * pitchTransformValues.scaleX,
      height: effectivePitchRect.height * pitchTransformValues.scaleY,
    }),
    [pitchTransformValues, effectivePitchRect],
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
    pitchRect: effectivePitchRect,
    activeSlide: effectiveSlide,
    activeSlideId,
    containerRef,
    nodesRegistryRef,
    pitchGroupsRef,
    editingTextId,
    setEditingTextId,
  });

  const { playAnimation, pauseAnimation, applyFrameToCanvas } =
    useTacticalAnimation({ nodesRegistryRef, pitchSize: effectivePitchSize });

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

  if (!activeSlide || !effectiveSlide) return null;

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
      {/* DOM ピッチ背景: absolute z-0, CSS 3D tilt はこちらで処理 */}
      <PitchBackgroundDom
        width={stageSize.width}
        height={stageSize.height}
        tilt={tilt}
        panX={panX}
        panY={panY}
        zoom={zoom}
        aspectRatio={aspectRatio}
        backgroundType={backgroundType}
        backgroundImageUrl={backgroundImageUrl}
        style={{ zIndex: 0 }}
      />
      {/* 正対 2D Konva Stage: CSS 3D なし, z-10 */}
      <Stage
        ref={(node: Konva.Stage | null) => {
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
        style={{
          cursor: cursorStyle,
          position: 'absolute',
          inset: 0,
          zIndex: 10,
        }}
      >
        {/* Layer 1: 背景レイヤー */}
        <Layer
          listening={false}
          ref={(node) => {
            nodesRegistryRef.current.backgroundLayer = node;
          }}
        />

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
              slide={effectiveSlide}
              stageSize={effectivePitchSize}
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
              slide={effectiveSlide}
              stageSize={effectivePitchSize}
              nodesRegistryRef={nodesRegistryRef}
            />
            <BallObject
              ball={effectiveSlide.ball}
              stageSize={effectivePitchSize}
              nodesRegistryRef={nodesRegistryRef}
            />
          </Group>
        </Layer>

        {/* Layer 4: UI & プレビューレイヤー (チルトに追従) */}
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
          </Group>
          <DrawingPreviewLayer
            drawingState={null}
            selectionBox={selectionBox}
          />
        </Layer>
      </Stage>

      {/* BoundaryBox: 正対固定 DOM/SVG オーバーレイ */}
      <BoundaryBox
        boundaryBox={effectiveSlide.boundaryBox}
        stageSize={stageSize}
        pitchRect={transformedPitchRect}
        isExporting={isExporting}
        onUpdate={(box) => updateBoundaryBox(activeSlideId, box)}
        onCommit={(box) => setBoundaryBox(activeSlideId, box)}
      />

      <DrawingToolbar />
      <ContextHud
        stageSize={stageSize}
        pitchRect={transformedPitchRect}
        nodesRegistryRef={nodesRegistryRef}
      />
      <BoundaryBoxHud stageSize={stageSize} pitchRect={transformedPitchRect} />

      <PitchInlineTextEditor
        editingText={editingText}
        stageSize={stageSize}
        pitchRect={effectivePitchRect}
        pitchTransform={pitchTransform}
        onSave={(textId: string, content: string) => {
          updateText(activeSlideId, textId, { content });
        }}
        onRemove={(textId: string) => {
          removeText(activeSlideId, textId);
          clearSelection();
        }}
        onClose={() => setEditingTextId(null)}
      />
    </div>
  );
}
