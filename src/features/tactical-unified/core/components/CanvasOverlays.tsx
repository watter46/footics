'use client';

import type React from 'react';
import type { TextAnnotation } from '@/lib/types/tactical-unified';
import { BoundaryBoxHud } from './BoundaryBoxHud';
import { BoundaryBoxOverlay } from './BoundaryBoxOverlay';
import { ContextHud } from './ContextHud';
import { PitchInlineTextEditor } from './PitchInlineTextEditor';

export interface CanvasOverlaysProps {
  vRect: { width: number; height: number };
  editingText: TextAnnotation | null;
  onSaveText: (id: string, content: string) => void;
  onRemoveText: (id: string) => void;
  onCloseText: () => void;
}

export function CanvasOverlays({
  vRect,
  editingText,
  onSaveText,
  onRemoveText,
  onCloseText,
}: CanvasOverlaysProps) {
  const stageSize = { width: vRect.width, height: vRect.height };

  return (
    <>
      <BoundaryBoxOverlay width={vRect.width} height={vRect.height} />
      <ContextHud stageSize={stageSize} />
      <BoundaryBoxHud stageSize={stageSize} />
      <PitchInlineTextEditor
        editingText={editingText}
        stageSize={stageSize}
        onSave={onSaveText}
        onRemove={onRemoveText}
        onClose={onCloseText}
      />
    </>
  );
}
