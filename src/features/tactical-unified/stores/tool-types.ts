import type { DrawingPreviewState } from '../core/types';
import type {
  DrawingTool,
  ExportTarget,
  MarkerOptionTab,
  PanelState,
  RightPanelTab,
  SelectedObject,
  SelectedObjectKind,
  WorkspaceMode,
} from './session-ui-state';

export type {
  DrawingTool,
  ExportTarget,
  MarkerOptionTab,
  PanelState,
  RightPanelTab,
  SelectedObject,
  SelectedObjectKind,
  WorkspaceMode,
};

export interface ToolSlice {
  // ── ツール & 選択状態
  activeTool: DrawingTool;
  continuousDrawing: boolean;
  selectedObjects: SelectedObject[];
  connectingPlayerId: string | null;
  activeMarkerOptionTab: MarkerOptionTab | null;

  // ── キャンバス作図設定 & 一時UI状態
  drawingPreview: DrawingPreviewState | null;
  isDragging: boolean;
  isHudOpen: boolean;
  color: string;
  strokeWidth: number;
  fontSize: number;
  customColor: string;
  markerMode: '2d-only' | '3d-only' | 'all';

  // ── 表示制御
  teamVisibility: 'both' | 'home' | 'away';
  panels: PanelState;
  workspaceMode: WorkspaceMode;
  savedPanelStateBeforeDirector: {
    sidebarOpen: boolean;
    isRightPanelOpen: boolean;
  } | null;

  // ── アクション
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  toggleWorkspaceMode: () => void;
  setActiveTool: (tool: DrawingTool) => void;
  setContinuousDrawing: (val: boolean) => void;
  toggleContinuousDrawing: () => void;
  setColor: (color: string) => void;
  setCustomColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  setMarkerMode: (mode: '2d-only' | '3d-only' | 'all') => void;
  setDrawingPreview: (preview: DrawingPreviewState | null) => void;
  setIsDragging: (dragging: boolean) => void;
  setIsHudOpen: (open: boolean) => void;
  selectObject: (obj: SelectedObject | null, multi?: boolean) => void;
  selectObjects: (objects: SelectedObject[], multi?: boolean) => void;
  clearSelection: () => void;
  setActiveMarkerOptionTab: (tab: MarkerOptionTab | null) => void;
  setConnectingPlayerId: (id: string | null) => void;
  setTeamVisibility: (visibility: 'both' | 'home' | 'away') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  setRightPanelTab: (tab: RightPanelTab) => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  toggleSplitPreview: () => void;
  setSplitPreviewOpen: (open: boolean) => void;
  openExportModal: (target?: ExportTarget) => void;
  closeExportModal: () => void;
  openProjectManagerModal: () => void;
  closeProjectManagerModal: () => void;
}
