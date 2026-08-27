'use client';

/**
 * unified-canvas.tsx
 * Central canvas orchestrator — Konva Stage + Pitch + Objects
 */

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Arrow, Layer, Line, Stage } from 'react-konva';
import type { ExportTarget } from '@/lib/types/tactical-unified';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';
import { useKonvaExport } from '../hooks/use-konva-export';
import { DrawingToolbar } from '../toolbar/drawing-toolbar';
import { AnnotationLayer } from './annotation-layer';
import { BallObject } from './ball-object';
import { createCanvasNodesRegistry } from './canvas-registry';
import { PitchBackground } from './pitch-background';
import { PlayerLayer } from './player-layer';

export function normToPx(norm: number, size: number): number {
  return (norm / 100) * size;
}

export function pxToNorm(px: number, size: number): number {
  return (px / size) * 100;
}

interface DrawingState {
  isDrawing: boolean;
  tool: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

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
  const setActiveTool = useTacticalUnifiedStore((s) => s.setActiveTool);
  const connectingPlayerId = useTacticalUnifiedStore(
    (s) => s.connectingPlayerId,
  );
  const setActiveSlide = useTacticalUnifiedStore((s) => s.setActiveSlide);
  const setBackgroundImageUrl = useTacticalUnifiedStore(
    (s) => s.setBackgroundImageUrl,
  );
  const setBackgroundType = useTacticalUnifiedStore((s) => s.setBackgroundType);

  // Store 描画アクション
  const addArrow = useTacticalUnifiedStore((s) => s.addArrow);
  const addZone = useTacticalUnifiedStore((s) => s.addZone);
  const updateZone = useTacticalUnifiedStore((s) => s.updateZone);
  const removeZone = useTacticalUnifiedStore((s) => s.removeZone);
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);
  const addText = useTacticalUnifiedStore((s) => s.addText);
  const addPlayerFromPalette = useTacticalUnifiedStore(
    (s) => s.addPlayerFromPalette,
  );

  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);

  // Polygon Zone 作成状態
  const [activePolygonId, setActivePolygonId] = useState<string | null>(null);
  const [mousePreviewPos, setMousePreviewPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // ツール切り替え時に未完了ポリゴンを破棄
  useEffect(() => {
    if (activeTool !== 'polygon_zone' && activePolygonId) {
      removeZone(activeSlideId, activePolygonId);
      setActivePolygonId(null);
      setMousePreviewPos(null);
    }
  }, [activeTool, activePolygonId, activeSlideId, removeZone]);

  const { copyToClipboard, runExport } = useKonvaExport({
    stageRef,
    activateSlide: async (slideId) => {
      setActiveSlide(slideId);
      await new Promise((r) => setTimeout(r, 100));
    },
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

  // URLパラメーター ?screenshot=<dataUrl> → 背景バインド
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
  }, [setBackgroundImageUrl, setBackgroundType]);

  // 📋 PNG clipboard コピー
  useEffect(() => {
    const handler = () => copyToClipboard();
    window.addEventListener('tactical:copy-png', handler);
    return () => window.removeEventListener('tactical:copy-png', handler);
  }, [copyToClipboard]);

  // 📤 書き出しイベント受信
  useEffect(() => {
    const handler = (e: Event) => {
      const target = (e as CustomEvent).detail as ExportTarget;
      void runExport(target);
    };
    window.addEventListener('tactical:export', handler);
    return () => window.removeEventListener('tactical:export', handler);
  }, [runExport]);

  // ── マウス / タッチ描画ハンドラ ──────────────────────────────

  const handlePointerDown = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;

      const normX = pxToNorm(pos.x, stageSize.width);
      const normY = pxToNorm(pos.y, stageSize.height);

      if (activeTool === 'select') {
        // 背景クリックで選択解除
        const isBg =
          e.target === stage ||
          e.target.className === 'Rect' ||
          e.target.className === 'Image';
        if (isBg) {
          clearSelection();
        }
        return;
      }

      if (activeTool === 'player') {
        addPlayerFromPalette('home', normX, normY);
        setActiveTool('select');
        return;
      }

      if (activeTool === 'text') {
        addText(activeSlideId, {
          id: crypto.randomUUID(),
          annotationType: 'text',
          x: Math.max(0, Math.min(100, normX)),
          y: Math.max(0, Math.min(100, normY)),
          content: 'テキスト',
          fontSize: 16,
          color: '#ffffff',
          bold: false,
          italic: false,
        });
        setActiveTool('select');
        return;
      }

      // 多角形フリーゾーン描画
      if (activeTool === 'polygon_zone') {
        if (!activePolygonId) {
          const id = crypto.randomUUID();
          addZone(activeSlideId, {
            id,
            annotationType: 'zone',
            zoneType: 'generic',
            shapeType: 'polygon',
            rotation: 0,
            points: [{ x: normX, y: normY }],
            color: '#22c55e',
            opacity: 0.35,
            strokeColor: '#22c55e',
            strokeWidth: 2,
            isComplete: false,
          });
          setActivePolygonId(id);
        } else {
          const poly = activeSlide?.zones.find((z) => z.id === activePolygonId);
          if (!poly || !poly.points.length) return;

          const startPt = poly.points[0];
          const dist = Math.hypot(normX - startPt.x, normY - startPt.y);

          // 3点以上で始点近傍をクリックしたら閉じて確定
          if (poly.points.length >= 3 && dist < 3.5) {
            updateZone(activeSlideId, activePolygonId, { isComplete: true });
            selectObject({ id: activePolygonId, kind: 'zone' });
            setActivePolygonId(null);
            setMousePreviewPos(null);
            setActiveTool('select');
            return;
          }

          // 次の頂点を追加
          updateZone(activeSlideId, activePolygonId, {
            points: [...poly.points, { x: normX, y: normY }],
          });
        }
        return;
      }

      if (
        activeTool === 'arrow_solid' ||
        activeTool === 'arrow_dash' ||
        activeTool === 'zone_circle' ||
        activeTool === 'arrow-straight' ||
        activeTool === 'arrow-curved' ||
        activeTool === 'zone'
      ) {
        setDrawingState({
          isDrawing: true,
          tool: activeTool,
          startX: pos.x,
          startY: pos.y,
          currentX: pos.x,
          currentY: pos.y,
        });
      }
    },
    [
      activeTool,
      activeSlideId,
      activeSlide?.zones,
      activePolygonId,
      stageSize,
      clearSelection,
      addPlayerFromPalette,
      addText,
      addZone,
      updateZone,
      selectObject,
      setActiveTool,
    ],
  );

  const handlePointerMove = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;

      if (activePolygonId) {
        setMousePreviewPos(pos);
      }

      if (!drawingState?.isDrawing) return;

      setDrawingState((prev) =>
        prev
          ? {
              ...prev,
              currentX: pos.x,
              currentY: pos.y,
            }
          : null,
      );
    },
    [activePolygonId, drawingState?.isDrawing],
  );

  const handlePointerUp = useCallback(() => {
    if (!drawingState?.isDrawing) return;

    const { startX, startY, currentX, currentY, tool } = drawingState;
    const dist = Math.hypot(currentX - startX, currentY - startY);

    // 最小ドラッグ距離（5px以上）で確定
    if (dist >= 5) {
      const sNormX = Math.max(
        0,
        Math.min(100, pxToNorm(startX, stageSize.width)),
      );
      const sNormY = Math.max(
        0,
        Math.min(100, pxToNorm(startY, stageSize.height)),
      );
      const cNormX = Math.max(
        0,
        Math.min(100, pxToNorm(currentX, stageSize.width)),
      );
      const cNormY = Math.max(
        0,
        Math.min(100, pxToNorm(currentY, stageSize.height)),
      );

      const isArrowTool =
        tool === 'arrow_solid' ||
        tool === 'arrow-straight' ||
        tool === 'arrow_dash' ||
        tool === 'arrow-curved';

      if (isArrowTool) {
        const startPoint = { x: sNormX, y: sNormY };
        const endPoint = { x: cNormX, y: cNormY };

        if (tool === 'arrow_solid' || tool === 'arrow-straight') {
          addArrow(activeSlideId, {
            id: crypto.randomUUID(),
            annotationType: 'arrow',
            arrowType: 'pass',
            curveType: 'straight',
            points: [startPoint, endPoint],
            color: '#38bdf8',
            strokeWidth: 3,
            dashArray: [],
            arrowHead: true,
          });
          setActiveTool('select');
        } else if (tool === 'arrow_dash' || tool === 'arrow-curved') {
          addArrow(activeSlideId, {
            id: crypto.randomUUID(),
            annotationType: 'arrow',
            arrowType: 'move',
            curveType: 'straight',
            points: [startPoint, endPoint],
            color: '#fbbf24',
            strokeWidth: 3,
            dashArray: [6, 4],
            arrowHead: true,
          });
          setActiveTool('select');
        }
      } else if (tool === 'zone_circle' || tool === 'zone') {
        const minX = Math.min(sNormX, cNormX);
        const maxX = Math.max(sNormX, cNormX);
        const minY = Math.min(sNormY, cNormY);
        const maxY = Math.max(sNormY, cNormY);
        const w = maxX - minX;
        const h = maxY - minY;

        const zoneId = crypto.randomUUID();
        addZone(activeSlideId, {
          id: zoneId,
          annotationType: 'zone',
          zoneType: 'generic',
          shapeType: 'rect',
          x: minX,
          y: minY,
          width: w,
          height: h,
          rotation: 0,
          points: [
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY },
          ],
          color: '#22c55e',
          opacity: 0.35,
          strokeColor: '#22c55e',
          strokeWidth: 2,
          isComplete: true,
        });
        selectObject({ id: zoneId, kind: 'zone' });
        setActiveTool('select');
      }
    }

    setDrawingState(null);
  }, [
    drawingState,
    stageSize,
    activeSlideId,
    addArrow,
    addZone,
    selectObject,
    setActiveTool,
  ]);

  if (!activeSlide) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-[#0a0a0a]"
    >
      {/* Floating & draggable drawing toolbar */}
      <DrawingToolbar />

      <Stage
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={stageRef as any}
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
              : activeTool === 'player'
                ? 'copy'
                : 'crosshair',
        }}
      >
        {/* 背景ピッチ */}
        <Layer listening={false}>
          <PitchBackground
            width={stageSize.width}
            height={stageSize.height}
            aspectRatio={aspectRatio}
            backgroundType={backgroundType}
            backgroundImageUrl={backgroundImageUrl}
          />
        </Layer>

        {/* アノテーション */}
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
          />
        </Layer>

        {/* 描画中プレビューレイヤー */}
        {drawingState?.isDrawing && (
          <Layer listening={false}>
            {(drawingState.tool === 'arrow_solid' ||
              drawingState.tool === 'arrow-straight') && (
              <Arrow
                points={[
                  drawingState.startX,
                  drawingState.startY,
                  drawingState.currentX,
                  drawingState.currentY,
                ]}
                stroke="#38bdf8"
                fill="#38bdf8"
                strokeWidth={3}
                pointerLength={15}
                pointerWidth={15}
                opacity={0.85}
                perfectDrawEnabled={false}
              />
            )}
            {(drawingState.tool === 'arrow_dash' ||
              drawingState.tool === 'arrow-curved') && (
              <Arrow
                points={[
                  drawingState.startX,
                  drawingState.startY,
                  drawingState.currentX,
                  drawingState.currentY,
                ]}
                stroke="#fbbf24"
                fill="#fbbf24"
                strokeWidth={3}
                dash={[6, 4]}
                pointerLength={15}
                pointerWidth={15}
                opacity={0.85}
                perfectDrawEnabled={false}
              />
            )}
            {(drawingState.tool === 'zone_circle' ||
              drawingState.tool === 'zone') && (
              <Line
                points={[
                  Math.min(drawingState.startX, drawingState.currentX),
                  Math.min(drawingState.startY, drawingState.currentY),
                  Math.max(drawingState.startX, drawingState.currentX),
                  Math.min(drawingState.startY, drawingState.currentY),
                  Math.max(drawingState.startX, drawingState.currentX),
                  Math.max(drawingState.startY, drawingState.currentY),
                  Math.min(drawingState.startX, drawingState.currentX),
                  Math.max(drawingState.startY, drawingState.currentY),
                ]}
                closed
                fill="rgba(239, 68, 68, 0.25)"
                stroke="#ef4444"
                strokeWidth={1.5}
                dash={[4, 4]}
                perfectDrawEnabled={false}
              />
            )}
          </Layer>
        )}

        {/* ボール */}
        <Layer
          ref={(node) => {
            nodesRegistryRef.current.ballLayer = node;
          }}
        >
          <BallObject
            ball={activeSlide.ball}
            stageSize={stageSize}
            nodesRegistryRef={nodesRegistryRef}
          />
        </Layer>

        {/* 選手レイヤー */}
        <Layer
          ref={(node) => {
            nodesRegistryRef.current.playerLayer = node;
          }}
        >
          <PlayerLayer
            slide={activeSlide}
            stageSize={stageSize}
            nodesRegistryRef={nodesRegistryRef}
          />
        </Layer>
      </Stage>
    </div>
  );
}
