'use client';

import type Konva from 'konva';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Stage } from 'react-konva';
import { useCanvasExport } from '../hooks/use-canvas-export';
import { useCanvasPointerDrawing } from '../hooks/use-canvas-pointer-drawing';
import { useCanvasStore } from '../hooks/use-canvas-store';
import type { CanvasCoreHandle, CanvasStageProps } from '../types';
import { calculateVirtualCanvasRect } from '../utils/virtual-canvas-rect';
import { AnnotationLayer } from './AnnotationLayer';
import { BackgroundImageLayer } from './BackgroundImageLayer';
import { BoundaryBoxOverlay } from './BoundaryBoxOverlay';
import { CoreDrawingToolbar } from './CoreDrawingToolbar';
import { DrawingPreviewLayer } from './DrawingPreviewLayer';
import { FootRingLayer } from './FootRingLayer';

export const CanvasStageContainer = forwardRef<
  CanvasCoreHandle,
  CanvasStageProps
>(function CanvasStageContainer({ className = '', imageAspect = 16 / 9 }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const canUndo = useCanvasStore((s) => s.canUndo);
  const canRedo = useCanvasStore((s) => s.canRedo);

  const { exportPng, copyToClipboard } = useCanvasExport({ stageRef });

  useImperativeHandle(
    ref,
    () => ({
      exportPng,
      copyToClipboard,
      undo,
      redo,
      canUndo,
      canRedo,
    }),
    [exportPng, copyToClipboard, undo, redo, canUndo, canRedo],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const vRect = calculateVirtualCanvasRect(containerSize, imageAspect);
  const { handlePointerDown, handlePointerMove, handlePointerUp } =
    useCanvasPointerDrawing({ vRect });

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
          >
            <BackgroundImageLayer width={vRect.width} height={vRect.height} />
            <AnnotationLayer width={vRect.width} height={vRect.height} />
            <FootRingLayer width={vRect.width} height={vRect.height} />
            <DrawingPreviewLayer width={vRect.width} height={vRect.height} />
          </Stage>

          <BoundaryBoxOverlay width={vRect.width} height={vRect.height} />
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <CoreDrawingToolbar />
      </div>
    </div>
  );
});
