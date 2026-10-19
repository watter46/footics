'use client';

import type { TextAnnotation } from '@/lib/types/tactical-unified';
import { normToScreen } from '../utils/canvas-coordinates';

export interface PitchInlineTextEditorProps {
  editingText: TextAnnotation | null;
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
  pitchTransform?: { panX: number; panY: number; zoom: number; tilt?: number };
  onSave: (textId: string, content: string) => void;
  onRemove: (textId: string) => void;
  onClose: () => void;
}

export function PitchInlineTextEditor({
  editingText,
  stageSize,
  pitchRect,
  pitchTransform,
  onSave,
  onRemove,
  onClose,
}: PitchInlineTextEditorProps): React.ReactNode {
  if (!editingText) return null;

  const panX = pitchTransform?.panX ?? 0;
  const panY = pitchTransform?.panY ?? 0;
  const zoom = pitchTransform?.zoom ?? 1;
  const tilt = pitchTransform?.tilt ?? 0;

  const effectivePitchRect = pitchRect ?? {
    x: 0,
    y: 0,
    width: stageSize.width,
    height: stageSize.height,
  };

  const screenPos = normToScreen(
    { x: editingText.x, y: editingText.y },
    effectivePitchRect,
    panX,
    panY,
    zoom,
    tilt,
  );

  const left = screenPos.x;
  const top = screenPos.y;
  const fontSize = editingText.fontSize * zoom;

  return (
    <textarea
      ref={(el) => {
        if (el) {
          el.focus();
          el.select();
        }
      }}
      defaultValue={editingText.content}
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        fontSize: `${fontSize}px`,
        color: editingText.color,
        fontWeight: editingText.bold ? 'bold' : 'normal',
        fontStyle: editingText.italic ? 'italic' : 'normal',
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        border: '1.5px solid #38bdf8',
        borderRadius: '4px',
        padding: '2px 6px',
        margin: 0,
        minWidth: '120px',
        minHeight: '32px',
        outline: 'none',
        resize: 'both',
        zIndex: 30,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        lineHeight: 1.25,
      }}
      onFocus={(e) => {
        e.currentTarget.select();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const val = e.currentTarget.value.trim();
          if (val) {
            onSave(editingText.id, val);
          } else {
            onRemove(editingText.id);
          }
          onClose();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          if (!editingText.content.trim()) {
            onRemove(editingText.id);
          }
          onClose();
        }
      }}
      onBlur={(e) => {
        const val = e.currentTarget.value.trim();
        if (val) {
          onSave(editingText.id, val);
        } else {
          onRemove(editingText.id);
        }
        onClose();
      }}
    />
  );
}
