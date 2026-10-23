import type { StoreApi } from 'zustand';
import type {
  ArrowAnnotation,
  AspectRatio,
  BoundaryBox,
  DrawingTool,
  PitchTransform,
  Player,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type { CanvasNodesRegistry } from './utils/canvas-registry';

export type { AspectRatio, DrawingTool, PitchTransform };

export type SelectedObjectKind =
  | 'player'
  | 'arrow'
  | 'zone'
  | 'text'
  | 'ball'
  | 'vision-cone'
  | 'connect-line'
  | 'badge'
  | 'focus';

export interface SelectedObject {
  id: string;
  kind: SelectedObjectKind;
  parentPlayerId?: string;
}

export interface CanvasConfig {
  mode: 'screenshot-edit' | 'tactical-board' | 'full-tactical';
  backgroundImageUrl?: string;
  initialAnnotations?: string;
  markerMode?: '2d-only' | '3d-only' | 'all';
  defaultBoundaryBox?: BoundaryBox;
  aspectRatio?: AspectRatio;
  defaultPitchTransform?: PitchTransform;
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
  tool: DrawingTool;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  points?: number[];
}

export interface CanvasHistorySnapshot {
  annotations: AnnotationsData;
  boundaryBox: BoundaryBox;
  pitchTransform: PitchTransform;
}

export interface CanvasClipboard {
  markers: Player[];
  arrows: ArrowAnnotation[];
  zones: ZoneAnnotation[];
  texts: TextAnnotation[];
}

export interface CanvasState {
  config: CanvasConfig;
  activeTool: DrawingTool;
  continuousDrawing: boolean;
  selectedObjects: SelectedObject[];
  selectedIds: string[];
  pitchTransform: PitchTransform;
  boundaryBox: BoundaryBox;
  aspectRatio: AspectRatio;
  annotations: AnnotationsData;
  clipboard: CanvasClipboard | null;
  color: string;
  strokeWidth: number;
  fontSize: number;
  markerMode: '2d-only' | '3d-only' | 'all';
  backgroundImageUrl?: string;
  drawingPreview: DrawingPreviewState | null;
  isDragging: boolean;
  isHudOpen: boolean;
  customColor: string;
  connectingPlayerId: string | null;
  history: {
    past: CanvasHistorySnapshot[];
    future: CanvasHistorySnapshot[];
  };
}

export interface CanvasActions {
  // ツール & 描画設定
  setActiveTool: (tool: DrawingTool) => void;
  setContinuousDrawing: (continuous: boolean) => void;
  toggleContinuousDrawing: () => void;
  setColor: (color: string) => void;
  setCustomColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  setMarkerMode: (mode: '2d-only' | '3d-only' | 'all') => void;
  setBackgroundImageUrl: (url: string | undefined) => void;
  setDrawingPreview: (preview: DrawingPreviewState | null) => void;
  setIsDragging: (isDragging: boolean) => void;
  setIsHudOpen: (isOpen: boolean) => void;
  setConnectingPlayerId: (id: string | null) => void;

  // 選択操作
  setSelectedIds: (ids: string[]) => void;
  setSelectedObjects: (objects: SelectedObject[]) => void;
  selectObject: (
    target: string | SelectedObject | null,
    isShiftOrMulti?: boolean,
  ) => void;
  selectObjects: (objects: SelectedObject[], multi?: boolean) => void;
  clearSelection: () => void;

  // ピッチ & 幾何操作
  setBoundaryBox: (boundaryBox: BoundaryBox) => void;
  setPitchTransform: (
    patch: Partial<PitchTransform> | ((prev: PitchTransform) => PitchTransform),
  ) => void;
  resetPitchTransform: () => void;
  setPitchLocked: (locked: boolean) => void;
  setAspectRatio: (aspectRatio: AspectRatio) => void;

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
  moveMarkerToBench?: (id: string) => void;

  removeSelected: () => void;
  setAnnotations: (annotations: AnnotationsData) => void;
  eraseAtPoint: (point: { x: number; y: number }, radius?: number) => void;

  // クリップボード操作
  copySelectedObjects: () => void;
  pasteObjects: () => void;
  duplicateSelectedObjects: () => void;

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
  /** 明示指定時のみ Stage 矩形を比率で contain フィット。未指定ならコンテナ全面。 */
  imageAspect?: number;
  /** 親(Level3)から注入するノードレジストリ（アニメーション hook と共有） */
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  /** Stage 実サイズ(px)の変化通知。親が座標写像（ピッチ矩形）に用いる */
  onStageSizeChange?: (size: { width: number; height: number }) => void;
  onAutoSave?: (json: string) => void;
  toolbar?: React.ReactNode;
  cleanRender?: boolean;
}
