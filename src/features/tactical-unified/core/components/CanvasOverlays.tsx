'use client';

import type React from 'react';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { DomainTextAnnotation } from '@/lib/types/tactical/domain-entities';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import { ContextHud } from './ContextHud';
import { PitchInlineTextEditor } from './PitchInlineTextEditor';

export interface CanvasOverlaysProps {
  vRect: { width: number; height: number; x?: number; y?: number };
  editingText: DomainTextAnnotation | null;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
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
  const connectingPlayerId = useSessionStore((s) => s.connectingPlayerId);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const project = useDocumentStore((s) => s.project);
  const pitchTransform = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  )?.pitchTransform;
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
      <ContextHud
        stageSize={stageSize}
        pitchRect={pitchRect}
        nodesRegistryRef={nodesRegistryRef}
      />
      <PitchInlineTextEditor
        editingText={editingText}
        stageSize={stageSize}
        pitchRect={pitchRect}
        pitchTransform={pitchTransform}
        onSave={onSaveText}
        onRemove={onRemoveText}
        onClose={onCloseText}
      />
    </>
  );
}
