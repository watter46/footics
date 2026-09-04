'use client';

/**
 * unified-canvas.tsx
 * Central canvas orchestrator — Konva Stage + Pitch + BoundaryBox + Objects
 *
 * Features:
 *  - Line & Route Line (●付き) drag drawing
 *  - Continuous Eraser mode (dragging erases annotations, preserves players, deletes marker options)
 *  - Resizable Boundary Box for export area definition
 *  - Dynamic cursor handling and screenshot background binding
 */

import type Konva from 'konva';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, Layer, Rect, Stage } from 'react-konva';
import type { ExportTarget } from '@/lib/types/tactical-unified';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';
import { ContextHud } from '../context-hud';
import { useKonvaExport } from '../hooks/use-konva-export';
import { useKonvaVideoExport } from '../hooks/use-konva-video-export';
import { useTacticalAnimation } from '../hooks/use-tactical-animation';
import { BoundaryBoxHud } from '../toolbar/boundary-box-hud';
import { DrawingToolbar } from '../toolbar/drawing-toolbar';
import { AnnotationLayer } from './annotation-layer';
import { BallObject } from './ball-object';
import { BoundaryBox } from './boundary-box';
import { createCanvasNodesRegistry } from './canvas-registry';
import { DrawingPreviewLayer } from './drawing-preview-layer';
import { PitchBackground } from './pitch-background';
import { PitchInlineTextEditor } from './pitch-inline-text-editor';
import { PlayerLayer } from './player-layer';
import { useCanvasPointerInteraction } from './use-canvas-pointer-interaction';

export { normToPx, pxToNorm } from './use-canvas-pointer-interaction';

export function UnifiedCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const nodesRegistryRef = useRef(createCanvasNodesRegistry());
  const [stageSize, setStageSize] = useState({ width: 800, height: 450 });

  const aspectRatio = useTacticalUnifiedStore((s) => s.project.aspectRatio);
  const backgroundType = useTacticalUnifiedStore(
    (s) => s.project.backgroundType,
  );
  const backgroundImageUrl = useTacticalUnifiedStore(
    (s) => s.project.backgroundImageUrl,
  );
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const clearSelection = useTacticalUnifiedStore((s) => s.clearSelection);
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const connectingPlayerId = useTacticalUnifiedStore(
    (s) => s.connectingPlayerId,
  );
  const setActiveSlide = useTacticalUnifiedStore((s) => s.setActiveSlide);
  const setBackgroundImageUrl = useTacticalUnifiedStore(
    (s) => s.setBackgroundImageUrl,
  );
  const setBackgroundType = useTacticalUnifiedStore((s) => s.setBackgroundType);
  const isExporting = useTacticalUnifiedStore((s) => s.isExporting);
  const setIsExporting = useTacticalUnifiedStore((s) => s.setIsExporting);
  const isPlaying = useTacticalUnifiedStore((s) => s.isPlaying);

  const updateText = useTacticalUnifiedStore((s) => s.updateText);
  const removeText = useTacticalUnifiedStore((s) => s.removeText);
  const setBoundaryBox = useTacticalUnifiedStore((s) => s.setBoundaryBox);

  // インラインテキスト編集状態
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const editingText = editingTextId
    ? (activeSlide?.texts.find((t) => t.id === editingTextId) ?? null)
    : null;

  // コンテナサイズと現在のアスペクト比から中央に収まるピッチ矩形を算出
  const pitchRect = useMemo(() => {
    const [wR, hR] = aspectRatio.split(':').map(Number) as [number, number];
    let pw = stageSize.width;
    let ph = (pw * hR) / wR;
    if (ph > stageSize.height) {
      ph = stageSize.height;
      pw = (ph * wR) / hR;
    }
    pw = Math.max(1, Math.floor(pw));
    ph = Math.max(1, Math.floor(ph));
    const px = Math.floor((stageSize.width - pw) / 2);
    const py = Math.floor((stageSize.height - ph) / 2);
    return { x: px, y: py, width: pw, height: ph };
  }, [aspectRatio, stageSize.width, stageSize.height]);

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

  // Pointer イベント＆描画・選択・回転インタラクションフック
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
    useTacticalAnimation({
      nodesRegistryRef,
    });

  // 再生状態の同期 (Play / Pause)
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

  // コンテナリサイズ → Stage サイズ更新 (全画面キャンバス)
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

  // URLパラメーター ?screenshot=<dataUrl> ＆ 拡張機能イベント受付 → 背景バインド＆デフォルトピッチ削除
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const screenshot = url.searchParams.get('screenshot');
    if (screenshot) {
      setBackgroundImageUrl(screenshot);
      setBackgroundType('image');
      url.searchParams.delete('screenshot');
      window.history.replaceState({}, '', url.toString());
    }

    const handleScreenshotEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string') {
        setBackgroundImageUrl(detail);
        setBackgroundType('image');
      } else if (detail?.imageUrl) {
        setBackgroundImageUrl(detail.imageUrl);
        setBackgroundType('image');
      }
    };

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'FOOTICS_SCREENSHOT' && e.data?.imageUrl) {
        setBackgroundImageUrl(e.data.imageUrl);
        setBackgroundType('image');
      }
    };

    window.addEventListener(
      'tactical:screenshot-background',
      handleScreenshotEvent,
    );
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener(
        'tactical:screenshot-background',
        handleScreenshotEvent,
      );
      window.removeEventListener('message', handleMessage);
    };
  }, [setBackgroundImageUrl, setBackgroundType]);

  // 📋 PNG clipboard コピー
  useEffect(() => {
    const handler = () => copyToClipboard();
    window.addEventListener('tactical:copy-png', handler);
    return () => window.removeEventListener('tactical:copy-png', handler);
  }, [copyToClipboard]);

  // 📤 書き出しイベント受信
  useEffect(() => {
    const handler = async (e: Event) => {
      const target = (e as CustomEvent).detail as ExportTarget;
      if (target.format === 'mp4' || target.format === 'webm') {
        setIsExporting(true);
        try {
          const videoBlob = await exportVideo(target);
          if (videoBlob) {
            const ext =
              target.format === 'mp4'
                ? videoBlob.type.includes('webm')
                  ? 'webm'
                  : 'mp4'
                : 'webm';
            const filename =
              target.format === 'mp4'
                ? `tactical-animation.${ext}`
                : 'tactical-overlay-transparent.webm';

            window.dispatchEvent(
              new CustomEvent('tactical:export-completed', {
                detail: { blob: videoBlob, filename, format: target.format },
              }),
            );
          } else {
            window.dispatchEvent(
              new CustomEvent('tactical:export-error', {
                detail: { error: 'No video output produced' },
              }),
            );
          }
        } catch (err) {
          console.error('Video export error:', err);
          window.dispatchEvent(
            new CustomEvent('tactical:export-error', {
              detail: {
                error: err instanceof Error ? err.message : String(err),
              },
            }),
          );
        } finally {
          setIsExporting(false);
        }
      } else {
        void runExport(target);
      }
    };
    window.addEventListener('tactical:export', handler);
    return () => window.removeEventListener('tactical:export', handler);
  }, [runExport, exportVideo, setIsExporting]);

  if (!activeSlide) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-[#0a0a0a] overflow-hidden"
    >
      {/* Floating & draggable drawing toolbar */}
      <DrawingToolbar />

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
          style={{
            cursor: connectingPlayerId
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
                      : 'crosshair',
          }}
        >
          {/* Layer 1: 背景レイヤー */}
          <Layer
            listening={false}
            ref={(node) => {
              nodesRegistryRef.current.backgroundLayer = node;
            }}
          >
            {/* キャンバス全体の黒背景（余白・レターボックス領域） */}
            <Rect
              x={0}
              y={0}
              width={stageSize.width}
              height={stageSize.height}
              fill="#0a0a0a"
              listening={false}
            />
            <Group
              x={pitchRect.x + panX}
              y={pitchRect.y + panY}
              scaleX={zoom}
              scaleY={zoom}
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
              x={pitchRect.x + panX}
              y={pitchRect.y + panY}
              scaleX={zoom}
              scaleY={zoom}
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

          {/* Layer 3: メイン要素レイヤー（選手 + ボール） */}
          <Layer
            ref={(node) => {
              nodesRegistryRef.current.playerLayer = node;
              nodesRegistryRef.current.ballLayer = node;
            }}
          >
            <Group
              x={pitchRect.x + panX}
              y={pitchRect.y + panY}
              scaleX={zoom}
              scaleY={zoom}
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

          {/* Layer 4: UI & プレビューレイヤー（描画中プレビュー + 範囲選択 Marquee + BoundaryBox） */}
          <Layer>
            <Group
              x={pitchRect.x + panX}
              y={pitchRect.y + panY}
              scaleX={zoom}
              scaleY={zoom}
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

            {/* エクスポート境界線 (BoundaryBox) - Stage 直下でキャンバス全体を自由にはみ出し移動・リサイズ可能 */}
            <BoundaryBox
              boundaryBox={activeSlide.boundaryBox}
              stageSize={stageSize}
              isExporting={isExporting}
              onUpdate={(box) => setBoundaryBox(activeSlideId, box)}
            />
          </Layer>
        </Stage>

        {/* Contextual Floating HUD */}
        <ContextHud
          stageSize={stageSize}
          pitchRect={pitchRect}
          nodesRegistryRef={nodesRegistryRef}
        />

        {/* Boundary Box Ratio & Snap HUD */}
        <BoundaryBoxHud stageSize={stageSize} />

        {/* ── ピッチ上インラインテキストエディタ ── */}
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
