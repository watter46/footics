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
import { calculateVirtualCanvasRect } from '../utils/virtual-canvas-rect';
import { AnnotationLayer } from './AnnotationLayer';
import { BackgroundImageLayer } from './BackgroundImageLayer';
import { CanvasOverlays } from './CanvasOverlays';
import { CoreDrawingToolbar } from './CoreDrawingToolbar';
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
>(function CanvasStageContainer({ className = '', imageAspect = 16 / 9 }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const containerSize = useContainerResize(containerRef);
  const vRect = calculateVirtualCanvasRect(containerSize, imageAspect);

  const texts = useCanvasStore((s) => s.annotations.texts);
  const updateText = useCanvasStore((s) => s.updateText);
  const removeText = useCanvasStore((s) => s.removeText);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const canUndo = useCanvasStore((s) => s.canUndo);
  const canRedo = useCanvasStore((s) => s.canRedo);

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

  const editingText = editingTextId
    ? (texts.find((t) => t.id === editingTextId) ?? null)
    : null;

  return (
    <div
      ref={containerRef}
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
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
          >
            <BackgroundImageLayer width={vRect.width} height={vRect.height} />
            <AnnotationLayer
              width={vRect.width}
              height={vRect.height}
              activePolygonId={activePolygonId}
              mousePreviewPos={mousePreviewPos}
              editingTextId={editingTextId}
              onStartEditText={setEditingTextId}
            />
            <PlayerLayer width={vRect.width} height={vRect.height} />
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
            onSaveText={(textId, content) => updateText(textId, { content })}
            onRemoveText={(textId) => {
              removeText(textId);
              clearSelection();
            }}
            onCloseText={() => setEditingTextId(null)}
          />
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <CoreDrawingToolbar />
      </div>
    </div>
  );
});
