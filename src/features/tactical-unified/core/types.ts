import type { StoreApi } from 'zustand';
import type {
  ArrowAnnotation,
  BoundaryBox,
  DrawingTool,
  Player,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';

export interface CanvasConfig {
  mode: 'screenshot-edit' | 'tactical-board';
  backgroundImageUrl?: string;
  initialAnnotations?: string;
  markerMode?: '2d-only' | '3d-only' | 'all';
  defaultBoundaryBox?: BoundaryBox;
}

export interface CanvasCoreHandle {
  exportPng: (options?: { crop?: boolean; scale?: number }) => Promise<string>;
  copyToClipboard: (options?: {
    crop?: boolean;
    scale?: number;
  }) => Promise<void>;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export interface AnnotationsData {
  arrows: ArrowAnnotation[];
  zones: ZoneAnnotation[];
  texts: TextAnnotation[];
  markers: Player[];
}

export interface DrawingPreviewState {
  isDrawing: boolean;
  tool: DrawingTool | string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  points?: number[];
}

export interface CanvasHistorySnapshot {
  annotations: AnnotationsData;
  boundaryBox: BoundaryBox;
}

export interface CanvasState {
  config: CanvasConfig;
  activeTool: DrawingTool | string;
  selectedIds: string[];
  color: string;
  strokeWidth: number;
  fontSize: number;
  markerMode: '2d-only' | '3d-only' | 'all';
  backgroundImageUrl?: string;
  boundaryBox: BoundaryBox;
  annotations: AnnotationsData;
  drawingPreview: DrawingPreviewState | null;
  history: {
    past: CanvasHistorySnapshot[];
    future: CanvasHistorySnapshot[];
  };
}

export interface CanvasActions {
  setActiveTool: (tool: DrawingTool | string) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  setMarkerMode: (mode: '2d-only' | '3d-only' | 'all') => void;
  setBackgroundImageUrl: (url: string | undefined) => void;
  setSelectedIds: (ids: string[]) => void;
  selectObject: (id: string, isShift?: boolean) => void;
  clearSelection: () => void;
  setBoundaryBox: (boundaryBox: BoundaryBox) => void;
  setDrawingPreview: (preview: DrawingPreviewState | null) => void;

  // アノテーション操作 (Undo対象)
  addArrow: (arrow: ArrowAnnotation) => void;
  updateArrow: (id: string, patch: Partial<ArrowAnnotation>) => void;
  removeArrow: (id: string) => void;

  addZone: (zone: ZoneAnnotation) => void;
  updateZone: (id: string, patch: Partial<ZoneAnnotation>) => void;
  removeZone: (id: string) => void;

  addText: (text: TextAnnotation) => void;
  updateText: (id: string, patch: Partial<TextAnnotation>) => void;
  removeText: (id: string) => void;

  addMarker: (marker: Player) => void;
  updateMarker: (id: string, patch: Partial<Player>) => void;
  removeMarker: (id: string) => void;

  removeSelected: () => void;
  setAnnotations: (annotations: AnnotationsData) => void;

  // 履歴操作
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export type CanvasStore = CanvasState & CanvasActions;
export type CanvasStoreApi = StoreApi<CanvasStore>;

export interface CanvasStageProps {
  className?: string;
  imageAspect?: number;
  onAutoSave?: (json: string) => void;
}
