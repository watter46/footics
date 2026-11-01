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
import { useCanvasExport } from '../hooks/use-canvas-export';
import { useCanvasPointerInteraction } from '../hooks/use-canvas-pointer-interaction';
import { useCanvasShortcuts } from '../hooks/use-canvas-shortcuts';
import { useCanvasStore } from '../hooks/use-canvas-store';
import { useCanvasViewport } from '../hooks/use-canvas-viewport';
import type { CanvasCoreHandle, CanvasStageProps } from '../types';
import {
  type CanvasNodesRegistry,
  createCanvasNodesRegistry,
} from '../utils/canvas-registry';
import { CanvasStage, type CanvasStageInteraction } from './canvas-stage';
import { HtmlHudOverlay } from './HtmlHudOverlay';

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
  const stageRef = useRef<Konva.Stage | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const { containerRef, containerSize, vRect } = useCanvasViewport({
    imageAspect,
    onStageSizeChange,
  });

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

  const stageInteraction: CanvasStageInteraction = useMemo(
    () => ({
      stageHandlers: {
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onWheel: handleWheel,
        onDragStart: () => {
          setIsDragging(true);
          setIsHudOpen(false);
        },
        onDragEnd: () => {
          setIsDragging(false);
        },
      },
      activePolygonId,
      mousePreviewPos,
      selectionBox,
      editingTextId,
      onStartEditText: setEditingTextId,
    }),
    [
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handleWheel,
      setIsDragging,
      setIsHudOpen,
      activePolygonId,
      mousePreviewPos,
      selectionBox,
      editingTextId,
    ],
  );

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
      className={`relative w-full h-full overflow-hidden select-none bg-surface-l0 transition-colors ${
        isOver ? 'ring-2 ring-blue-500/50' : ''
      } ${className}`}
    >
      <CanvasStage
        stageRef={stageRef}
        size={containerSize}
        vRect={vRect}
        nodesRegistryRef={nodesRegistryRef}
        cleanRender={cleanRender}
        interaction={stageInteraction}
      >
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
      </CanvasStage>

      {toolbar}
    </div>
  );
}
