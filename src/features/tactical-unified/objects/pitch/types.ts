import type { AspectRatio, TextAnnotation } from '@/lib/types/tactical-unified';

export interface PitchBackgroundProps {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  /** 背景画像URL (スクショバインド等) */
  backgroundImageUrl?: string;
  backgroundType?: 'pitch' | 'image' | 'blank';
  marginPercent?: number;
  grass?: boolean;
  draggable?: boolean;
  onDragEnd?: (pos: { x: number; y: number }) => void;
}

export interface PitchInlineTextEditorProps {
  editingText: TextAnnotation | null;
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
  pitchTransform?: { panX: number; panY: number; zoom: number; tilt?: number };
  onSave: (textId: string, content: string) => void;
  onRemove: (textId: string) => void;
  onClose: () => void;
}
