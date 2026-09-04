'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PitchTransform, Slide } from '@/lib/types/tactical-unified';
import {
  type SelectedObject,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';
import type { DrawingState, SelectionBox } from './canvas-interaction-types';
import type { CanvasNodesRegistry } from './canvas-registry';

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

function screenToPitch(
  pos: { x: number; y: number },
  pitchRect: { x: number; y: number; width: number; height: number },
  panX: number,
  panY: number,
  zoom: number,
) {
  return {
    x: (pos.x - pitchRect.x - panX) / zoom,
    y: (pos.y - pitchRect.y - panY) / zoom,
  };
}

interface UseCanvasPointerInteractionOptions {
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
  activeSlide: Slide | null | undefined;
  activeSlideId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  nodesRegistryRef: React.RefObject<CanvasNodesRegistry>;
  pitchGroupsRef?: React.RefObject<(Konva.Group | null)[]>;
  editingTextId: string | null;
  setEditingTextId: (id: string | null) => void;
}

export function useCanvasPointerInteraction({
  stageSize,
  pitchRect,
  activeSlide,
  activeSlideId,
  containerRef,
  nodesRegistryRef,
  pitchGroupsRef,
  setEditingTextId,
}: UseCanvasPointerInteractionOptions) {
  const effectivePitch = pitchRect ?? {
    x: 0,
    y: 0,
    width: stageSize.width,
    height: stageSize.height,
  };
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const setActiveTool = useTacticalUnifiedStore((s) => s.setActiveTool);
  const continuousDrawing = useTacticalUnifiedStore((s) => s.continuousDrawing);
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const clearSelection = useTacticalUnifiedStore((s) => s.clearSelection);
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);
  const selectObjects = useTacticalUnifiedStore((s) => s.selectObjects);

  // Store 描画アクション
  const addArrow = useTacticalUnifiedStore((s) => s.addArrow);
  const addZone = useTacticalUnifiedStore((s) => s.addZone);
  const updateZone = useTacticalUnifiedStore((s) => s.updateZone);
  const removeZone = useTacticalUnifiedStore((s) => s.removeZone);
  const addText = useTacticalUnifiedStore((s) => s.addText);
  const addPlayerFromPalette = useTacticalUnifiedStore(
    (s) => s.addPlayerFromPalette,
  );
  const eraseAtPoint = useTacticalUnifiedStore((s) => s.eraseAtPoint);
  const updatePitchTransform = useTacticalUnifiedStore(
    (s) => s.updatePitchTransform,
  );

  const pitchTransform = activeSlide?.pitchTransform ?? {
    panX: 0,
    panY: 0,
    zoom: 1,
    tilt: 0,
    isLocked: false,
  };
  const isPitchLocked = pitchTransform.isLocked ?? false;
  const pitchTransformRef = useRef<PitchTransform>(pitchTransform);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isSpacePressedRef = useRef(false);
  const panStateRef = useRef<{
    isPanning: boolean;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    hasMoved: boolean;
  } | null>(null);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const applyPitchTransformToNodes = useCallback(
    (panX: number, panY: number, zoom: number) => {
      pitchTransformRef.current = {
        ...pitchTransformRef.current,
        panX,
        panY,
        zoom,
      };

      if (pitchGroupsRef?.current) {
        const layersToRedraw = new Set<Konva.Layer>();
        for (const group of pitchGroupsRef.current) {
          if (group) {
            group.x(effectivePitch.x + panX);
            group.y(effectivePitch.y + panY);
            group.scaleX(zoom);
            group.scaleY(zoom);
            const l = group.getLayer();
            if (l) layersToRedraw.add(l);
          }
        }
        for (const layer of layersToRedraw) {
          layer.batchDraw();
        }
      }
    },
    [pitchGroupsRef, effectivePitch.x, effectivePitch.y],
  );

  useEffect(() => {
    pitchTransformRef.current = pitchTransform;
    applyPitchTransformToNodes(
      pitchTransform.panX ?? 0,
      pitchTransform.panY ?? 0,
      pitchTransform.zoom ?? 1,
    );
  }, [pitchTransform, applyPitchTransformToNodes]);

  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === 'Space' && !e.repeat) {
        isSpacePressedRef.current = true;
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        setIsSpacePressed(false);
      }
    };

    const handleBlur = () => {
      isSpacePressedRef.current = false;
      setIsSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition() ?? {
        x: stageSize.width / 2,
        y: stageSize.height / 2,
      };

      const oldZoom = pitchTransformRef.current.zoom ?? 1;
      const oldPanX = pitchTransformRef.current.panX ?? 0;
      const oldPanY = pitchTransformRef.current.panY ?? 0;

      const zoomFactor = e.evt.deltaY < 0 ? 1.08 : 1 / 1.08;
      const nextZoom = Math.max(0.2, Math.min(5.0, oldZoom * zoomFactor));
      if (Math.abs(nextZoom - oldZoom) < 0.0001) return;

      const scaleRatio = nextZoom / oldZoom;
      const nextPanX = pos.x - (pos.x - oldPanX) * scaleRatio;
      const nextPanY = pos.y - (pos.y - oldPanY) * scaleRatio;

      applyPitchTransformToNodes(nextPanX, nextPanY, nextZoom);

      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
      wheelTimeoutRef.current = setTimeout(() => {
        updatePitchTransform(activeSlideId, {
          zoom: pitchTransformRef.current.zoom,
          panX: pitchTransformRef.current.panX,
          panY: pitchTransformRef.current.panY,
        });
      }, 150);
    },
    [stageSize, activeSlideId, updatePitchTransform, applyPitchTransformToNodes],
  );

  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
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

  const handlePointerDown = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;

      const panX = pitchTransformRef.current.panX ?? 0;
      const panY = pitchTransformRef.current.panY ?? 0;
      const zoom = pitchTransformRef.current.zoom ?? 1;

      const pitchPos = screenToPitch(pos, effectivePitch, panX, panY, zoom);
      const normX = pxToNorm(pitchPos.x, effectivePitch.width);
      const normY = pxToNorm(pitchPos.y, effectivePitch.height);

      const isBg = e.target === stage;
      const isSpace = isSpacePressedRef.current;
      const shouldPan =
        isSpace || (activeTool === 'select' && !isPitchLocked && isBg);

      if (shouldPan) {
        panStateRef.current = {
          isPanning: true,
          startX: pos.x,
          startY: pos.y,
          startPanX: panX,
          startPanY: panY,
          hasMoved: false,
        };
        setIsPanning(true);
        return;
      }

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
            effectivePitch.width,
            effectivePitch.height,
          );
          isRotatingRef.current = true;
          currentRotationRef.current = null;
          rotateCenterRef.current = {
            x: cx,
            y: cy,
          };
          startMouseAngleRef.current = Math.atan2(
            pitchPos.y - cy,
            pitchPos.x - cx,
          );
          startShapeRotationRef.current = rotation;
          if (containerRef.current) {
            containerRef.current.style.cursor = ROTATE_CURSOR;
          }
          return;
        }

        // 背景クリック・ドラッグで範囲選択または選択解除を開始 (ピッチロック時)
        if (isBg) {
          const isShift =
            (e.evt as MouseEvent | TouchEvent as MouseEvent)?.shiftKey ?? false;
          setSelectionBox({
            startX: pos.x,
            startY: pos.y,
            currentX: pos.x,
            currentY: pos.y,
            isShift,
          });
        }
        return;
      }

      if (activeTool === 'player-ring') {
        const id = addPlayerFromPalette('home', normX, normY, 'ring');
        selectObject({ id, kind: 'player' });
        if (!continuousDrawing) {
          setActiveTool('select');
        }
        return;
      }

      if (activeTool === 'player') {
        const id = addPlayerFromPalette('home', normX, normY, 'circle');
        selectObject({ id, kind: 'player' });
        if (!continuousDrawing) {
          setActiveTool('select');
        }
        return;
      }

      if (activeTool === 'text') {
        const newTextId = crypto.randomUUID();
        addText(activeSlideId, {
          id: newTextId,
          annotationType: 'text',
          x: normX,
          y: normY,
          content: '',
          fontSize: 16,
          color: '#ffffff',
          bold: false,
          italic: false,
        });
        selectObject({ id: newTextId, kind: 'text' });
        setEditingTextId(newTextId);
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
        activeTool === 'arrow_wavy' ||
        activeTool === 'zone_circle' ||
        activeTool === 'arrow-straight' ||
        activeTool === 'arrow-curved' ||
        activeTool === 'zone'
      ) {
        setDrawingState({
          isDrawing: true,
          tool: activeTool,
          startX: pitchPos.x,
          startY: pitchPos.y,
          currentX: pitchPos.x,
          currentY: pitchPos.y,
        });
      }
    },
    [
      activeTool,
      isPitchLocked,
      selectedZone,
      activeSlideId,
      activeSlide?.zones,
      activePolygonId,
      effectivePitch.x,
      effectivePitch.y,
      effectivePitch.width,
      effectivePitch.height,
      clearSelection,
      eraseAtPoint,
      addText,
      setEditingTextId,
      containerRef,
      addPlayerFromPalette,
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

      if (panStateRef.current?.isPanning) {
        const dx = pos.x - panStateRef.current.startX;
        const dy = pos.y - panStateRef.current.startY;
        if (!panStateRef.current.hasMoved && Math.hypot(dx, dy) >= 4) {
          panStateRef.current.hasMoved = true;
        }
        const newPanX = panStateRef.current.startPanX + dx;
        const newPanY = panStateRef.current.startPanY + dy;
        applyPitchTransformToNodes(
          newPanX,
          newPanY,
          pitchTransformRef.current.zoom ?? 1,
        );
        return;
      }

      const panX = pitchTransformRef.current.panX ?? 0;
      const panY = pitchTransformRef.current.panY ?? 0;
      const zoom = pitchTransformRef.current.zoom ?? 1;

      const pitchPos = screenToPitch(pos, effectivePitch, panX, panY, zoom);
      const normX = pxToNorm(pitchPos.x, effectivePitch.width);
      const normY = pxToNorm(pitchPos.y, effectivePitch.height);

      if (activeTool === 'eraser' && isErasingRef.current) {
        eraseAtPoint(activeSlideId, { x: normX, y: normY }, 4.0);
        return;
      }

      if (selectionBox) {
        setSelectionBox((prev) =>
          prev
            ? {
                ...prev,
                currentX: pos.x,
                currentY: pos.y,
              }
            : null,
        );
        return;
      }

      if (activePolygonId) {
        setMousePreviewPos({ x: pitchPos.x, y: pitchPos.y });
      }

      // カスタム回転ドラッグ中の処理
      if (isRotatingRef.current && selectedZone) {
        const zoneNode = nodesRegistryRef.current?.zoneNodes.get(
          selectedZone.id,
        );
        if (zoneNode) {
          const cx = rotateCenterRef.current.x;
          const cy = rotateCenterRef.current.y;
          const currentAngle = Math.atan2(pitchPos.y - cy, pitchPos.x - cx);
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
        !drawingState?.isDrawing &&
        !panStateRef.current?.isPanning
      ) {
        const container = containerRef.current;
        if (container) {
          const isTransformerAnchor =
            e.target.getParent()?.getClassName() === 'Transformer';
          const isOver =
            !isTransformerAnchor &&
            checkCornerRotateZone(
              pitchPos,
              selectedZone,
              effectivePitch.width,
              effectivePitch.height,
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
              currentX: pitchPos.x,
              currentY: pitchPos.y,
            }
          : null,
      );
    },
    [
      activePolygonId,
      activeTool,
      selectedZone,
      effectivePitch.x,
      effectivePitch.y,
      effectivePitch.width,
      effectivePitch.height,
      drawingState?.isDrawing,
      selectionBox,
      eraseAtPoint,
      activeSlideId,
      containerRef,
      nodesRegistryRef,
      applyPitchTransformToNodes,
    ],
  );

  const handlePointerUp = useCallback(() => {
    if (panStateRef.current?.isPanning) {
      const { hasMoved } = panStateRef.current;
      panStateRef.current = null;
      setIsPanning(false);

      if (hasMoved) {
        updatePitchTransform(activeSlideId, {
          panX: pitchTransformRef.current.panX,
          panY: pitchTransformRef.current.panY,
        });
      } else {
        clearSelection();
      }
      return;
    }

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

    if (selectionBox) {
      const { startX, startY, currentX, currentY, isShift } = selectionBox;
      const dist = Math.hypot(currentX - startX, currentY - startY);

      if (dist >= 5 && activeSlide) {
        const minPxX = Math.min(startX, currentX);
        const maxPxX = Math.max(startX, currentX);
        const minPxY = Math.min(startY, currentY);
        const maxPxY = Math.max(startY, currentY);

        const panX = pitchTransformRef.current.panX ?? 0;
        const panY = pitchTransformRef.current.panY ?? 0;
        const zoom = pitchTransformRef.current.zoom ?? 1;

        const minPitchX = (minPxX - effectivePitch.x - panX) / zoom;
        const maxPitchX = (maxPxX - effectivePitch.x - panX) / zoom;
        const minPitchY = (minPxY - effectivePitch.y - panY) / zoom;
        const maxPitchY = (maxPxY - effectivePitch.y - panY) / zoom;

        const minNormX = pxToNorm(minPitchX, effectivePitch.width);
        const maxNormX = pxToNorm(maxPitchX, effectivePitch.width);
        const minNormY = pxToNorm(minPitchY, effectivePitch.height);
        const maxNormY = pxToNorm(maxPitchY, effectivePitch.height);

        const enclosedObjects: SelectedObject[] = [];

        // 1. ピッチ上の選手
        for (const player of activeSlide.players) {
          if (player.area === 'pitch') {
            if (
              player.x >= minNormX &&
              player.x <= maxNormX &&
              player.y >= minNormY &&
              player.y <= maxNormY
            ) {
              enclosedObjects.push({ id: player.id, kind: 'player' });
            }
          }
        }

        // 2. テキスト注釈
        for (const text of activeSlide.texts) {
          if (
            text.x >= minNormX &&
            text.x <= maxNormX &&
            text.y >= minNormY &&
            text.y <= maxNormY
          ) {
            enclosedObjects.push({ id: text.id, kind: 'text' });
          }
        }

        // 3. 矢印
        for (const arrow of activeSlide.arrows) {
          const isArrowInside = arrow.points.some(
            (pt) =>
              pt.x >= minNormX &&
              pt.x <= maxNormX &&
              pt.y >= minNormY &&
              pt.y <= maxNormY,
          );
          if (isArrowInside) {
            enclosedObjects.push({ id: arrow.id, kind: 'arrow' });
          }
        }

        // 4. ゾーン
        for (const zone of activeSlide.zones) {
          const isZoneInside = zone.points.some(
            (pt) =>
              pt.x >= minNormX &&
              pt.x <= maxNormX &&
              pt.y >= minNormY &&
              pt.y <= maxNormY,
          );
          if (isZoneInside) {
            enclosedObjects.push({ id: zone.id, kind: 'zone' });
          }
        }

        // 5. ボール
        if (
          activeSlide.ball?.visible &&
          activeSlide.ball.x >= minNormX &&
          activeSlide.ball.x <= maxNormX &&
          activeSlide.ball.y >= minNormY &&
          activeSlide.ball.y <= maxNormY
        ) {
          enclosedObjects.push({ id: 'ball', kind: 'ball' });
        }

        if (isShift) {
          selectObjects(enclosedObjects, true);
        } else {
          selectObjects(enclosedObjects, false);
        }
      } else {
        if (!isShift) {
          clearSelection();
        }
      }

      setSelectionBox(null);
      return;
    }

    if (!drawingState?.isDrawing) return;

    const { startX, startY, currentX, currentY, tool } = drawingState;
    const dist = Math.hypot(currentX - startX, currentY - startY);

    // 最小ドラッグ距離（5px以上）で確定
    if (dist >= 5) {
      const sNormX = Math.max(
        0,
        Math.min(100, pxToNorm(startX, effectivePitch.width)),
      );
      const sNormY = Math.max(
        0,
        Math.min(100, pxToNorm(startY, effectivePitch.height)),
      );
      const cNormX = Math.max(
        0,
        Math.min(100, pxToNorm(currentX, effectivePitch.width)),
      );
      const cNormY = Math.max(
        0,
        Math.min(100, pxToNorm(currentY, effectivePitch.height)),
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
          color: '#ef4444',
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
          color: '#ffffff',
          strokeWidth: 3,
          dashArray: [6, 4],
          arrowHead: true,
          endMarker: 'arrow',
        });
        if (!continuousDrawing) {
          setActiveTool('select');
        }
      } else if (tool === 'arrow_wavy') {
        addArrow(activeSlideId, {
          id: crypto.randomUUID(),
          annotationType: 'arrow',
          arrowType: 'dribble',
          curveType: 'straight',
          points: [startPoint, endPoint],
          color: '#fbbf24',
          strokeWidth: 3,
          dashArray: [],
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
    selectionBox,
    activeSlide,
    selectObjects,
    clearSelection,
    drawingState,
    effectivePitch.x,
    effectivePitch.y,
    effectivePitch.width,
    effectivePitch.height,
    activeSlideId,
    addArrow,
    addZone,
    selectObject,
    setActiveTool,
    continuousDrawing,
    selectedZone,
    updateZone,
    containerRef,
    updatePitchTransform,
  ]);

  return {
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
  };
}
