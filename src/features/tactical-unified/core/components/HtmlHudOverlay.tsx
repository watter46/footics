'use client';

import type React from 'react';
import type { ReactNode } from 'react';
import type { TextAnnotation } from '@/lib/types/tactical-unified';
import { useCanvasStore } from '../hooks/use-canvas-store';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import { BoundaryBoxHud } from './BoundaryBoxHud';
import { ContextHud } from './ContextHud';
import { PitchInlineTextEditor } from './PitchInlineTextEditor';

export interface HtmlHudOverlayProps {
  stageSize: { width: number; height: number };
  pitchRect: PitchRectBounds;
  editingText: TextAnnotation | null;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  cleanRender?: boolean;
  onSaveText: (id: string, content: string) => void;
  onRemoveText: (id: string) => void;
  onCloseText: () => void;
}

export function HtmlHudOverlay({
  stageSize,
  pitchRect,
  editingText,
  nodesRegistryRef,
  cleanRender,
  onSaveText,
  onRemoveText,
  onCloseText,
}: HtmlHudOverlayProps): ReactNode {
  const connectingPlayerId = useCanvasStore((s) => s.connectingPlayerId);

  if (cleanRender) return null;

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
