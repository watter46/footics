'use client';

/**
 * unified-canvas.tsx
 * Central canvas orchestrator — Konva Stage + Pitch + BoundaryBox + Objects
 *
 * Features:
 *  - Line & Route Line (●付き) drag drawing
 *  - Continuous Eraser mode (dragging erases annotations, preserves players, deletes marker options)
 *  - Resizable Boundary Box for export area definition
 *  - Bench player Drag & Drop onto pitch
 *  - Dynamic cursor handling and screenshot background binding
 */

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Arrow, Circle, Group, Layer, Line, Stage } from 'react-konva';
import type { ExportTarget } from '@/lib/types/tactical-unified';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';
import { useKonvaExport } from '../hooks/use-konva-export';
import { useKonvaVideoExport } from '../hooks/use-konva-video-export';
import { useTacticalAnimation } from '../hooks/use-tactical-animation';
import { DrawingToolbar } from '../toolbar/drawing-toolbar';
import { AnnotationLayer } from './annotation-layer';
import { BallObject } from './ball-object';
import { BoundaryBox } from './boundary-box';
import { createCanvasNodesRegistry } from './canvas-registry';
import { PitchBackground } from './pitch-background';
import { PlayerLayer } from './player-layer';

export function normToPx(norm: number, size: number): number {
  return (norm / 100) * size;
}

export function pxToNorm(px: number, size: number): number {
  return (px / size) * 100;
}

const ROTATE_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2338bdf8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'/><path d='M21 3v5h-5'/><path d='M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'/><path d='M3 21v-5h5'/></svg>") 12 12, crosshair`;

function getZonePixelBounds(
  zone: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    points?: Array<{ x: number; y: number }>;
  },
  stageWidth: number,
  stageHeight: number,
) {
  const normPosX = zone.x ?? zone.points?.[0]?.x ?? 20;
  const normPosY = zone.y ?? zone.points?.[0]?.y ?? 20;
  let normW =
    zone.width ??
    (zone.points && zone.points.length >= 2
      ? Math.abs(zone.points[1].x - zone.points[0].x)
      : 30);
  let normH =
    zone.height ??
    (zone.points && zone.points.length >= 4
      ? Math.abs(zone.points[2].y - zone.points[0].y)
      : 20);

  if (normW <= 0) normW = 20;
  if (normH <= 0) normH = 15;

  const pxW = (normW / 100) * stageWidth;
  const pxH = (normH / 100) * stageHeight;
  const cx = (normPosX / 100) * stageWidth + pxW / 2;
  const cy = (normPosY / 100) * stageHeight + pxH / 2;
  const rotation = zone.rotation || 0;

  return { pxW, pxH, cx, cy, rotation };
}

function checkCornerRotateZone(
  pos: { x: number; y: number },
  zone: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    shapeType?: string;
    points?: Array<{ x: number; y: number }>;
  },
  stageWidth: number,
  stageHeight: number,
): boolean {
  if (zone.shapeType === 'polygon') return false;
  const { pxW, pxH, cx, cy, rotation } = getZonePixelBounds(
    zone,
    stageWidth,
    stageHeight,
  );

  const rad = (rotation * Math.PI) / 180;
  const hw = pxW / 2;
  const hh = pxH / 2;

  const cornersLocal = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: -hw, y: hh },
    { x: hw, y: hh },
  ];

  const corners = cornersLocal.map((pt) => ({
    x: cx + pt.x * Math.cos(rad) - pt.y * Math.sin(rad),
    y: cy + pt.x * Math.sin(rad) + pt.y * Math.cos(rad),
  }));

  for (const corner of corners) {
    const dist = Math.hypot(pos.x - corner.x, pos.y - corner.y);
    if (dist >= 6 && dist <= 28) {
      return true;
    }
  }
  return false;
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
  const continuousDrawing = useTacticalUnifiedStore((s) => s.continuousDrawing);
  const connectingPlayerId = useTacticalUnifiedStore(
    (s) => s.connectingPlayerId,
  );
  const setActiveSlide = useTacticalUnifiedStore((s) => s.setActiveSlide);
  const setBackgroundImageUrl = useTacticalUnifiedStore(
    (s) => s.setBackgroundImageUrl,
  );
  const setBackgroundType = useTacticalUnifiedStore((s) => s.setBackgroundType);
  const isExporting = useTacticalUnifiedStore((s) => s.isExporting);

  // Store 描画アクション
  const addArrow = useTacticalUnifiedStore((s) => s.addArrow);
  const addZone = useTacticalUnifiedStore((s) => s.addZone);
  const updateZone = useTacticalUnifiedStore((s) => s.updateZone);
  const removeZone = useTacticalUnifiedStore((s) => s.removeZone);
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const addText = useTacticalUnifiedStore((s) => s.addText);
  const eraseAtPoint = useTacticalUnifiedStore((s) => s.eraseAtPoint);
  const setBoundaryBox = useTacticalUnifiedStore((s) => s.setBoundaryBox);
  const movePlayerToPitch = useTacticalUnifiedStore((s) => s.movePlayerToPitch);

  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);
  const isErasingRef = useRef(false);

  // Polygon Zone 作成状態
  const [activePolygonId, setActivePolygonId] = useState<string | null>(null);
  const [mousePreviewPos, setMousePreviewPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // 角ホバーカスタム回転用 Refs
  const isRotatingRef = useRef(false);
  const rotateCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startMouseAngleRef = useRef(0);
  const startShapeRotationRef = useRef(0);
  const currentRotationRef = useRef<number | null>(null);
  const isOverRotateZoneRef = useRef(false);

  const selectedZone =
    selectedObjects.length === 1 && selectedObjects[0].kind === 'zone'
      ? activeSlide?.zones.find((z) => z.id === selectedObjects[0].id)
      : null;

  // ツール切り替え時に未完了ポリゴンを破棄
  useEffect(() => {
    if (activeTool !== 'polygon_zone' && activePolygonId) {
      removeZone(activeSlideId, activePolygonId);
      setActivePolygonId(null);
      setMousePreviewPos(null);
    }
  }, [activeTool, activePolygonId, activeSlideId, removeZone]);

  const isPlaying = useTacticalUnifiedStore((s) => s.isPlaying);

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

  const setIsExporting = useTacticalUnifiedStore((s) => s.setIsExporting);

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

  // ── マウス / タッチ描画ハンドラ ──────────────────────────────

  const handlePointerDown = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;

      const normX = pxToNorm(pos.x, stageSize.width);
      const normY = pxToNorm(pos.y, stageSize.height);

      if (activeTool === 'eraser') {
        isErasingRef.current = true;
        eraseAtPoint(activeSlideId, { x: normX, y: normY }, 4.0);
        return;
      }

      if (activeTool === 'select') {
        // 四隅回転エリアでのクリックの場合、カスタム回転モードを開始
        const isTransformerAnchor =
          e.target.getParent()?.getClassName() === 'Transformer';

        if (
          selectedZone &&
          selectedZone.shapeType !== 'polygon' &&
          isOverRotateZoneRef.current &&
          !isTransformerAnchor
        ) {
          const { cx, cy, rotation } = getZonePixelBounds(
            selectedZone,
            stageSize.width,
            stageSize.height,
          );
          isRotatingRef.current = true;
          currentRotationRef.current = null;
          rotateCenterRef.current = { x: cx, y: cy };
          startMouseAngleRef.current = Math.atan2(pos.y - cy, pos.x - cx);
          startShapeRotationRef.current = rotation;
          if (containerRef.current) {
            containerRef.current.style.cursor = ROTATE_CURSOR;
          }
          return;
        }

        // 背景クリックで選択解除
        const isBg = e.target === stage;
        if (isBg) {
          clearSelection();
        }
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
          if (!poly?.points.length) return;

          const startPt = poly.points[0];
          const dist = Math.hypot(normX - startPt.x, normY - startPt.y);

          // 3点以上で始点近傍をクリックしたら閉じて確定
          if (poly.points.length >= 3 && dist < 3.5) {
            updateZone(activeSlideId, activePolygonId, { isComplete: true });
            selectObject({ id: activePolygonId, kind: 'zone' });
            setActivePolygonId(null);
            setMousePreviewPos(null);
            if (!continuousDrawing) {
              setActiveTool('select');
            }
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
        activeTool === 'line' ||
        activeTool === 'route_line' ||
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
      selectedZone,
      activeSlideId,
      activeSlide?.zones,
      activePolygonId,
      stageSize,
      clearSelection,
      eraseAtPoint,
      addText,
      addZone,
      updateZone,
      selectObject,
      setActiveTool,
      continuousDrawing,
    ],
  );

  const handlePointerMove = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;

      const normX = pxToNorm(pos.x, stageSize.width);
      const normY = pxToNorm(pos.y, stageSize.height);

      if (activeTool === 'eraser' && isErasingRef.current) {
        eraseAtPoint(activeSlideId, { x: normX, y: normY }, 4.0);
        return;
      }

      if (activePolygonId) {
        setMousePreviewPos(pos);
      }

      // カスタム回転ドラッグ中の処理
      if (isRotatingRef.current && selectedZone) {
        const zoneNode = nodesRegistryRef.current.zoneNodes.get(
          selectedZone.id,
        );
        if (zoneNode) {
          const cx = rotateCenterRef.current.x;
          const cy = rotateCenterRef.current.y;
          const currentAngle = Math.atan2(pos.y - cy, pos.x - cx);
          const angleDiffRad = currentAngle - startMouseAngleRef.current;
          const angleDiffDeg = (angleDiffRad * 180) / Math.PI;

          const newRotation =
            (startShapeRotationRef.current + angleDiffDeg) % 360;
          currentRotationRef.current = newRotation;
          zoneNode.rotation(newRotation);
          zoneNode.getLayer()?.batchDraw();
          return;
        }
      }

      // ホバー時：四隅の回転外側ゾーン判定とカーソル切替
      if (
        activeTool === 'select' &&
        selectedZone &&
        selectedZone.shapeType !== 'polygon' &&
        !drawingState?.isDrawing
      ) {
        const container = containerRef.current;
        if (container) {
          const isTransformerAnchor =
            e.target.getParent()?.getClassName() === 'Transformer';
          const isOver =
            !isTransformerAnchor &&
            checkCornerRotateZone(
              pos,
              selectedZone,
              stageSize.width,
              stageSize.height,
            );
          isOverRotateZoneRef.current = isOver;

          if (isOver) {
            container.style.cursor = ROTATE_CURSOR;
          } else if (container.style.cursor.includes('data:image/svg+xml')) {
            container.style.cursor = 'default';
          }
        }
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
    [
      activePolygonId,
      activeTool,
      selectedZone,
      stageSize.width,
      stageSize.height,
      drawingState?.isDrawing,
      eraseAtPoint,
      activeSlideId,
    ],
  );

  const handlePointerUp = useCallback(() => {
    if (isErasingRef.current) {
      isErasingRef.current = false;
      return;
    }

    if (isRotatingRef.current) {
      isRotatingRef.current = false;
      if (currentRotationRef.current !== null && selectedZone) {
        updateZone(activeSlideId, selectedZone.id, {
          rotation: currentRotationRef.current,
        });
      }
      const container = containerRef.current;
      if (container?.style.cursor.includes('data:image/svg+xml')) {
        container.style.cursor = 'default';
      }
      return;
    }

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

      const startPoint = { x: sNormX, y: sNormY };
      const endPoint = { x: cNormX, y: cNormY };

      if (tool === 'line') {
        addArrow(activeSlideId, {
          id: crypto.randomUUID(),
          annotationType: 'arrow',
          arrowType: 'line',
          curveType: 'straight',
          points: [startPoint, endPoint],
          color: '#ffffff',
          strokeWidth: 2.5,
          dashArray: [],
          arrowHead: false,
          endMarker: 'none',
        });
        if (!continuousDrawing) {
          setActiveTool('select');
        }
      } else if (tool === 'route_line') {
        addArrow(activeSlideId, {
          id: crypto.randomUUID(),
          annotationType: 'arrow',
          arrowType: 'route_line',
          curveType: 'straight',
          points: [startPoint, endPoint],
          color: '#38bdf8',
          strokeWidth: 3,
          dashArray: [],
          arrowHead: false,
          endMarker: 'dot',
        });
        if (!continuousDrawing) {
          setActiveTool('select');
        }
      } else if (tool === 'arrow_solid' || tool === 'arrow-straight') {
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
          endMarker: 'arrow',
        });
        if (!continuousDrawing) {
          setActiveTool('select');
        }
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
          endMarker: 'arrow',
        });
        if (!continuousDrawing) {
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
        if (!continuousDrawing) {
          setActiveTool('select');
        }
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
    continuousDrawing,
    selectedZone,
    updateZone,
  ]);

  // サブメンバーをピッチへドロップした時のハンドラ
  const handleContainerDrop = useCallback(
    (e: React.DragEvent) => {
      try {
        const raw = e.dataTransfer.getData('application/json');
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.type === 'bench-player' && data.playerId) {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const pxX =
              e.clientX - rect.left - (rect.width - stageSize.width) / 2;
            const pxY =
              e.clientY - rect.top - (rect.height - stageSize.height) / 2;
            const normX = Math.max(
              0,
              Math.min(100, pxToNorm(pxX, stageSize.width)),
            );
            const normY = Math.max(
              0,
              Math.min(100, pxToNorm(pxY, stageSize.height)),
            );
            movePlayerToPitch(activeSlideId, data.playerId, normX, normY);
          }
        }
      } catch {
        // ignore
      }
    },
    [activeSlideId, stageSize, movePlayerToPitch],
  );

  if (!activeSlide) return null;

  return (
    <div
      ref={containerRef}
      onDrop={handleContainerDrop}
      onDragOver={(e) => e.preventDefault()}
      className="relative w-full h-full flex items-center justify-center bg-[#0a0a0a]"
    >
      {/* Floating & draggable drawing toolbar */}
      <DrawingToolbar />

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
        {/* 背景ピッチ */}
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
            {drawingState.tool === 'line' && (
              <Line
                points={[
                  drawingState.startX,
                  drawingState.startY,
                  drawingState.currentX,
                  drawingState.currentY,
                ]}
                stroke="#ffffff"
                strokeWidth={2.5}
                opacity={0.85}
                perfectDrawEnabled={false}
              />
            )}

            {drawingState.tool === 'route_line' &&
              (() => {
                const dx = drawingState.currentX - drawingState.startX;
                const dy = drawingState.currentY - drawingState.startY;
                const dist = Math.hypot(dx, dy);
                const dotRadius = 6;
                let sx = drawingState.startX;
                let sy = drawingState.startY;
                let ex = drawingState.currentX;
                let ey = drawingState.currentY;
                if (dist > dotRadius * 2) {
                  const ux = dx / dist;
                  const uy = dy / dist;
                  sx += ux * dotRadius;
                  sy += uy * dotRadius;
                  ex -= ux * dotRadius;
                  ey -= uy * dotRadius;
                }
                return (
                  <Group>
                    <Line
                      points={[sx, sy, ex, ey]}
                      stroke="#38bdf8"
                      strokeWidth={3}
                      opacity={0.85}
                      perfectDrawEnabled={false}
                    />
                    <Circle
                      x={drawingState.startX}
                      y={drawingState.startY}
                      radius={dotRadius}
                      stroke="#38bdf8"
                      strokeWidth={2}
                      fill="transparent"
                      perfectDrawEnabled={false}
                    />
                    <Circle
                      x={drawingState.currentX}
                      y={drawingState.currentY}
                      radius={dotRadius}
                      stroke="#38bdf8"
                      strokeWidth={2}
                      fill="transparent"
                      perfectDrawEnabled={false}
                    />
                  </Group>
                );
              })()}

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

        {/* エクスポート境界線 (BoundaryBox) */}
        <Layer>
          <BoundaryBox
            boundaryBox={activeSlide.boundaryBox}
            stageSize={stageSize}
            isExporting={isExporting}
            onUpdate={(box) => setBoundaryBox(activeSlideId, box)}
          />
        </Layer>
      </Stage>
    </div>
  );
}
