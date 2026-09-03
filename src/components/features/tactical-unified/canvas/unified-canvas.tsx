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
import { useEffect, useRef, useState } from 'react';
import { Layer, Stage } from 'react-konva';
import type { ExportTarget } from '@/lib/types/tactical-unified';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';
import { ContextHud } from '../context-hud';
import { useKonvaExport } from '../hooks/use-konva-export';
import { useKonvaVideoExport } from '../hooks/use-konva-video-export';
import { useTacticalAnimation } from '../hooks/use-tactical-animation';
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

  // Pointer イベント＆描画・選択・回転インタラクションフック
  const {
    drawingState,
    selectionBox,
    activePolygonId,
    mousePreviewPos,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useCanvasPointerInteraction({
    stageSize,
    activeSlide,
    activeSlideId,
    containerRef,
    nodesRegistryRef,
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

  // コンテナリサイズ → Stage サイズ更新
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const [wR, hR] = aspectRatio.split(':').map(Number) as [number, number];
      let sw = width;
      let sh = (sw * hR) / wR;
      if (sh > height) {
        sh = height;
        sw = (sh * wR) / hR;
      }
      setStageSize({ width: Math.floor(sw), height: Math.floor(sh) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [aspectRatio]);

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
      className="relative w-full h-full flex items-center justify-center bg-[#0a0a0a]"
    >
      {/* Floating & draggable drawing toolbar */}
      <DrawingToolbar />

      <div
        className="relative"
        style={{ width: stageSize.width, height: stageSize.height }}
      >
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
          style={{
            cursor: connectingPlayerId
              ? 'crosshair'
              : activeTool === 'select'
                ? 'default'
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
            <PitchBackground
              width={stageSize.width}
              height={stageSize.height}
              aspectRatio={aspectRatio}
              backgroundType={backgroundType}
              backgroundImageUrl={backgroundImageUrl}
            />
          </Layer>

          {/* Layer 2: アノテーションレイヤー */}
          <Layer
            ref={(node) => {
              nodesRegistryRef.current.annotationLayer = node;
            }}
          >
            <AnnotationLayer
              slide={activeSlide}
              stageSize={stageSize}
              nodesRegistryRef={nodesRegistryRef}
              activePolygonId={activePolygonId}
              mousePreviewPos={mousePreviewPos}
              editingTextId={editingTextId}
              onStartEditText={(textId) => setEditingTextId(textId)}
            />
          </Layer>

          {/* Layer 3: メイン要素レイヤー（選手 + ボール） */}
          <Layer
            ref={(node) => {
              nodesRegistryRef.current.playerLayer = node;
              nodesRegistryRef.current.ballLayer = node;
            }}
          >
            <PlayerLayer
              slide={activeSlide}
              stageSize={stageSize}
              nodesRegistryRef={nodesRegistryRef}
            />
            <BallObject
              ball={activeSlide.ball}
              stageSize={stageSize}
              nodesRegistryRef={nodesRegistryRef}
            />
          </Layer>

          {/* Layer 4: UI & プレビューレイヤー（描画中プレビュー + 範囲選択 Marquee + BoundaryBox） */}
          <Layer>
            <DrawingPreviewLayer
              drawingState={drawingState}
              selectionBox={selectionBox}
            />

            {/* エクスポート境界線 (BoundaryBox) */}
            <BoundaryBox
              boundaryBox={activeSlide.boundaryBox}
              stageSize={stageSize}
              isExporting={isExporting}
              onUpdate={(box) => setBoundaryBox(activeSlideId, box)}
            />
          </Layer>
        </Stage>

        {/* Contextual Floating HUD */}
        <ContextHud stageSize={stageSize} nodesRegistryRef={nodesRegistryRef} />

        {/* ── ピッチ上インラインテキストエディタ ── */}
        <PitchInlineTextEditor
          editingText={editingText}
          stageSize={stageSize}
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
