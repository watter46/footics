'use client';

import { useDroppable } from '@dnd-kit/core';
import type Konva from 'konva';
import type React from 'react';
import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Stage } from 'react-konva';
import { ASPECT_RATIOS } from '@/lib/types/tactical-unified';
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
import { BillboardObjectLayer } from './BillboardObjectLayer';
import { HtmlHudOverlay } from './HtmlHudOverlay';
import { InteractionPreviewLayer } from './InteractionPreviewLayer';
import { PitchGroundLayer } from './PitchGroundLayer';
import { ViewportCropOverlay } from './ViewportCropOverlay';

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

export interface CanvasStageContainerProps extends CanvasStageProps {
  ref?: React.Ref<CanvasCoreHandle>;
}

export function CanvasStageContainer({
  className = '',
  imageAspect,
  nodesRegistryRef: injectedRegistryRef,
  onStageSizeChange,
  toolbar,
  cleanRender,
  ref,
}: CanvasStageContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const containerSize = useContainerResize(containerRef);
  const storeAspectRatio = useCanvasStore((s) => s.aspectRatio);
  const effectiveAspect =
    imageAspect ??
    (storeAspectRatio ? ASPECT_RATIOS[storeAspectRatio] : undefined) ??
    (containerSize.height > 0 ? containerSize.width / containerSize.height : 1);

  const paddingRatio = useCanvasStore((s) => s.capabilities?.paddingRatio ?? 0);
  const vRect = useMemo(
    () =>
      calculateVirtualCanvasRect(
        containerSize,
        effectiveAspect,
        undefined,
        paddingRatio,
      ),
    [containerSize, effectiveAspect, paddingRatio],
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

  const { exportPng, copyToClipboard } = useCanvasExport({
    stageRef,
    vRect,
    pitchRect: vRect,
  });

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

  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: 'tactical-pitch-droppable',
    data: { type: 'pitch' },
  });

  useEffect(() => {
    nodesRegistryRef.current.stage = stageRef.current;
    nodesRegistryRef.current.pitchRect = vRect;
  }, [nodesRegistryRef, vRect]);

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
      ref={(node) => {
        containerRef.current = node;
        setDroppableNodeRef(node);
      }}
      style={
        {
          '--toolbar-right': toolbarRight,
          '--toolbar-transform': toolbarTransform,
        } as React.CSSProperties
      }
      className={`relative w-full h-full overflow-hidden select-none bg-zinc-950 transition-colors ${
        isOver ? 'ring-2 ring-blue-500/50' : ''
      } ${className}`}
    >
      {containerSize.width > 0 && containerSize.height > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: containerSize.width,
            height: containerSize.height,
          }}
        >
          <Stage
            ref={stageRef}
            width={containerSize.width}
            height={containerSize.height}
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
            <PitchGroundLayer
              stageSize={containerSize}
              pitchRect={vRect}
              activePolygonId={activePolygonId}
              mousePreviewPos={mousePreviewPos}
              nodesRegistryRef={nodesRegistryRef}
              cleanRender={cleanRender}
            />
            <BillboardObjectLayer
              stageSize={containerSize}
              pitchRect={vRect}
              editingTextId={editingTextId}
              onStartEditText={setEditingTextId}
              nodesRegistryRef={nodesRegistryRef}
              cleanRender={cleanRender}
            />
            <InteractionPreviewLayer
              stageSize={containerSize}
              pitchRect={vRect}
              selectionBox={selectionBox}
              activePolygonId={activePolygonId}
              mousePreviewPos={mousePreviewPos}
              cleanRender={cleanRender}
            />
          </Stage>

          <ViewportCropOverlay
            stageSize={containerSize}
            pitchRect={vRect}
            cleanRender={cleanRender}
          />
          <HtmlHudOverlay
            stageSize={containerSize}
            pitchRect={vRect}
            editingText={editingText}
            nodesRegistryRef={nodesRegistryRef}
            cleanRender={cleanRender}
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
}
