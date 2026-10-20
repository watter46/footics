'use client';

import type Konva from 'konva';
import type React from 'react';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Stage } from 'react-konva';
import { useCanvasExport } from '../hooks/use-canvas-export';
import { useCanvasPointerInteraction } from '../hooks/use-canvas-pointer-interaction';
import { useCanvasShortcuts } from '../hooks/use-canvas-shortcuts';
import { useCanvasStore } from '../hooks/use-canvas-store';
import type { CanvasCoreHandle, CanvasStageProps } from '../types';
import {
  type CanvasNodesRegistry,
  createCanvasNodesRegistry,
} from '../utils/canvas-registry';
import { calculateVirtualCanvasRect } from '../utils/virtual-canvas-rect';
import { AnnotationLayer } from './AnnotationLayer';
import { BackgroundImageLayer } from './BackgroundImageLayer';
import { CanvasOverlays } from './CanvasOverlays';
import { DrawingPreviewLayer } from './DrawingPreviewLayer';
import { PlayerLayer } from './PlayerLayer';

function useContainerResize(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  return size;
}

export const CanvasStageContainer = forwardRef<
  CanvasCoreHandle,
  CanvasStageProps
>(function CanvasStageContainer(
  {
    className = '',
    imageAspect,
    nodesRegistryRef: injectedRegistryRef,
    onStageSizeChange,
    toolbar,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const containerSize = useContainerResize(containerRef);
  const vRect = calculateVirtualCanvasRect(
    containerSize,
    // Stage は常にコンテナ全面。imageAspect 明示時のみ比率フィット
    imageAspect ??
      (containerSize.height > 0
        ? containerSize.width / containerSize.height
        : 1),
  );

  useEffect(() => {
    if (vRect.width > 0 && vRect.height > 0) {
      onStageSizeChange?.({ width: vRect.width, height: vRect.height });
    }
  }, [vRect.width, vRect.height, onStageSizeChange]);

  const texts = useCanvasStore((s) => s.annotations.texts);
  const updateText = useCanvasStore((s) => s.updateText);
  const removeText = useCanvasStore((s) => s.removeText);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const canUndo = useCanvasStore((s) => s.canUndo);
  const canRedo = useCanvasStore((s) => s.canRedo);

  const setIsDragging = useCanvasStore((s) => s.setIsDragging);
  const setIsHudOpen = useCanvasStore((s) => s.setIsHudOpen);

  useCanvasShortcuts();

  const {
    selectionBox,
    activePolygonId,
    mousePreviewPos,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useCanvasPointerInteraction({
    vRect,
    containerRef,
    onStartEditText: (textId) => setEditingTextId(textId),
  });

  const { exportPng, copyToClipboard } = useCanvasExport({ stageRef, vRect });

  useImperativeHandle(
    ref,
    () => ({
      exportPng,
      copyToClipboard,
      undo,
      redo,
      canUndo: () => canUndo(),
      canRedo: () => canRedo(),
    }),
    [exportPng, copyToClipboard, undo, redo, canUndo, canRedo],
  );

  const internalRegistryRef = useRef<CanvasNodesRegistry>(
    createCanvasNodesRegistry(),
  );
  const nodesRegistryRef = injectedRegistryRef ?? internalRegistryRef;

  useEffect(() => {
    nodesRegistryRef.current.stage = stageRef.current;
  });

  const editingText = editingTextId
    ? (texts.find((t) => t.id === editingTextId) ?? null)
    : null;

  const rightMargin =
    containerSize.width > 0
      ? Math.max(0, containerSize.width - (vRect.x + vRect.width))
      : 0;
  const toolbarRight =
    rightMargin >= 64 ? `${Math.round(rightMargin / 2)}px` : '12px';
  const toolbarTransform =
    rightMargin >= 64 ? 'translate(50%, -50%)' : 'translateY(-50%)';

  return (
    <div
      ref={containerRef}
      style={
        {
          '--toolbar-right': toolbarRight,
          '--toolbar-transform': toolbarTransform,
        } as React.CSSProperties
      }
      className={`relative w-full h-full overflow-hidden select-none bg-zinc-950 ${className}`}
    >
      {vRect.width > 0 && vRect.height > 0 && (
        <div
          style={{
            position: 'absolute',
            left: vRect.x,
            top: vRect.y,
            width: vRect.width,
            height: vRect.height,
          }}
        >
          <Stage
            ref={stageRef}
            width={vRect.width}
            height={vRect.height}
            dragDistance={3}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            onDragStart={() => {
              setIsDragging(true);
              setIsHudOpen(false);
            }}
            onDragEnd={() => {
              setIsDragging(false);
            }}
          >
            <BackgroundImageLayer width={vRect.width} height={vRect.height} />
            <AnnotationLayer
              width={vRect.width}
              height={vRect.height}
              activePolygonId={activePolygonId}
              mousePreviewPos={mousePreviewPos}
              editingTextId={editingTextId}
              onStartEditText={setEditingTextId}
              nodesRegistryRef={nodesRegistryRef}
            />
            <PlayerLayer
              width={vRect.width}
              height={vRect.height}
              nodesRegistryRef={nodesRegistryRef}
            />
            <DrawingPreviewLayer
              width={vRect.width}
              height={vRect.height}
              selectionBox={selectionBox}
              activePolygonId={activePolygonId}
              mousePreviewPos={mousePreviewPos}
            />
          </Stage>

          <CanvasOverlays
            vRect={vRect}
            editingText={editingText}
            nodesRegistryRef={nodesRegistryRef}
            onSaveText={(textId, content) => updateText(textId, { content })}
            onRemoveText={(textId) => {
              removeText(textId);
              clearSelection();
            }}
            onCloseText={() => setEditingTextId(null)}
          />
        </div>
      )}

      {toolbar}
    </div>
  );
});
