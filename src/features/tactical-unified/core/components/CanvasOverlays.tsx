'use client';

import type React from 'react';
import type { TextAnnotation } from '@/lib/types/tactical-unified';
import { useCanvasStore } from '../hooks/use-canvas-store';
import { BoundaryBoxHud } from './BoundaryBoxHud';
import { BoundaryBoxOverlay } from './BoundaryBoxOverlay';
import { ContextHud } from './ContextHud';
import { PitchInlineTextEditor } from './PitchInlineTextEditor';

export interface CanvasOverlaysProps {
  vRect: { width: number; height: number; x?: number; y?: number };
  editingText: TextAnnotation | null;
  nodesRegistryRef?: React.MutableRefObject<unknown>;
  onSaveText: (id: string, content: string) => void;
  onRemoveText: (id: string) => void;
  onCloseText: () => void;
}

export function CanvasOverlays({
  vRect,
  editingText,
  nodesRegistryRef,
  onSaveText,
  onRemoveText,
  onCloseText,
}: CanvasOverlaysProps) {
  const stageSize = { width: vRect.width, height: vRect.height };
  const connectingPlayerId = useCanvasStore((s) => s.connectingPlayerId);
  const pitchRect =
    'x' in vRect &&
    'y' in vRect &&
    vRect.x !== undefined &&
    vRect.y !== undefined
      ? {
          x: vRect.x,
          y: vRect.y,
          width: vRect.width,
          height: vRect.height,
        }
      : undefined;

  return (
    <>
      {connectingPlayerId && (
        <div
          role="status"
          aria-live="polite"
          data-testid="connecting-guidance-badge"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full bg-[#0d99ff] text-white text-xs font-medium shadow-lg flex items-center gap-1.5 pointer-events-none select-none animate-in fade-in slide-in-from-top-2"
          style={{
            backgroundColor: '#0d99ff',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(13, 153, 255, 0.45)',
          }}
        >
          <span>🔗 接続先マーカーをクリックしてください (ESCでキャンセル)</span>
        </div>
      )}
      <BoundaryBoxOverlay
        width={vRect.width}
        height={vRect.height}
        pitchRect={pitchRect}
      />
      <ContextHud
        stageSize={stageSize}
        pitchRect={pitchRect}
        nodesRegistryRef={nodesRegistryRef}
      />
      <BoundaryBoxHud stageSize={stageSize} pitchRect={pitchRect} />
      <PitchInlineTextEditor
        editingText={editingText}
        stageSize={stageSize}
        pitchRect={pitchRect}
        onSave={onSaveText}
        onRemove={onRemoveText}
        onClose={onCloseText}
      />
    </>
  );
}
