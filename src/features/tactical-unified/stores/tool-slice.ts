import type { StateCreator } from 'zustand';
import type { DrawingTool, ExportTarget } from '@/lib/types/tactical-unified';
import type { DrawingPreviewState } from '../core/types';
import type { TacticalUnifiedState } from './tactical-unified-store';

export type { DrawingTool, ExportTarget };

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

export type MarkerOptionTab =
  | 'vision'
  | 'connect'
  | 'arrow_solid'
  | 'arrow_dash'
  | 'badge'
  | 'focus'
  | 'basic';

export interface SelectedObject {
  id: string;
  kind: SelectedObjectKind;
  /** 親選手ID (ネストアノテーションの場合) */
  parentPlayerId?: string;
}

export interface PanelState {
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  rightPanelTab: 'formation' | 'squad' | 'pitch';
  isRightPanelOpen: boolean;
  splitPreviewOpen?: boolean;
  exportModalOpen: boolean;
  projectManagerModalOpen: boolean;
}

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

  // ── アクション
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
  setRightPanelTab: (tab: 'formation' | 'squad' | 'pitch') => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  toggleSplitPreview: () => void;
  setSplitPreviewOpen: (open: boolean) => void;
  openExportModal: (target?: ExportTarget) => void;
  closeExportModal: () => void;
  openProjectManagerModal: () => void;
  closeProjectManagerModal: () => void;
}

export const createToolSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  ToolSlice
> = (set, _get, _store) => ({
  activeTool: 'select',
  continuousDrawing: false,
  selectedObjects: [],
  connectingPlayerId: null,
  activeMarkerOptionTab: null,
  drawingPreview: null,
  isDragging: false,
  isHudOpen: true,
  color: '#ffffff',
  strokeWidth: 2,
  fontSize: 14,
  customColor: '#ffffff',
  markerMode: 'all',
  teamVisibility: 'both',
  panels: {
    sidebarOpen: false,
    inspectorOpen: true,
    rightPanelTab: 'formation',
    isRightPanelOpen: false,
    splitPreviewOpen: false,
    exportModalOpen: false,
    projectManagerModalOpen: false,
  },

  setActiveTool: (tool) => set({ activeTool: tool }),

  setContinuousDrawing: (val) => set({ continuousDrawing: val }),

  toggleContinuousDrawing: () =>
    set((s) => ({ continuousDrawing: !s.continuousDrawing })),

  setColor: (color) => set((s) => (s.color === color ? s : { color })),

  setCustomColor: (customColor) =>
    set((s) => (s.customColor === customColor ? s : { customColor })),

  setStrokeWidth: (strokeWidth) =>
    set((s) => (s.strokeWidth === strokeWidth ? s : { strokeWidth })),

  setFontSize: (fontSize) =>
    set((s) => (s.fontSize === fontSize ? s : { fontSize })),

  setMarkerMode: (markerMode) =>
    set((s) => (s.markerMode === markerMode ? s : { markerMode })),

  setDrawingPreview: (drawingPreview) =>
    set((s) => (s.drawingPreview === drawingPreview ? s : { drawingPreview })),

  setIsDragging: (isDragging) =>
    set((s) => (s.isDragging === isDragging ? s : { isDragging })),

  setIsHudOpen: (isHudOpen) =>
    set((s) => (s.isHudOpen === isHudOpen ? s : { isHudOpen })),

  selectObject: (obj, multi = false) =>
    set((s) => {
      if (!obj) {
        return {
          selectedObjects: [],
          activeMarkerOptionTab: null,
        };
      }
      if (multi) {
        const already = s.selectedObjects.find((o) => o.id === obj.id);
        return {
          selectedObjects: already
            ? s.selectedObjects.filter((o) => o.id !== obj.id)
            : [...s.selectedObjects, obj],
          isHudOpen: true,
        };
      }
      return {
        selectedObjects: [obj],
        isHudOpen: true,
      };
    }),

  selectObjects: (objects, multi = false) =>
    set((s) => {
      if (objects.length === 0 && !multi) {
        return {
          selectedObjects: [],
          activeMarkerOptionTab: null,
        };
      }
      if (multi) {
        const existingIds = new Set(s.selectedObjects.map((o) => o.id));
        const newItems = objects.filter((o) => !existingIds.has(o.id));
        return {
          selectedObjects: [...s.selectedObjects, ...newItems],
        };
      }
      return {
        selectedObjects: objects,
        activeMarkerOptionTab:
          objects.length === 1 && objects[0].kind === 'player'
            ? 'vision'
            : null,
        ...(objects.length === 1 ? { isHudOpen: true } : {}),
      };
    }),

  clearSelection: () =>
    set({
      selectedObjects: [],
      activeMarkerOptionTab: null,
    }),

  setActiveMarkerOptionTab: (tab) => set({ activeMarkerOptionTab: tab }),

  setConnectingPlayerId: (id) => set({ connectingPlayerId: id }),

  setTeamVisibility: (visibility) => set({ teamVisibility: visibility }),

  toggleSidebar: () =>
    set((s) => ({
      panels: { ...s.panels, sidebarOpen: !s.panels.sidebarOpen },
    })),

  setSidebarOpen: (open) =>
    set((s) => ({ panels: { ...s.panels, sidebarOpen: open } })),

  setInspectorOpen: (open) =>
    set((s) => ({ panels: { ...s.panels, inspectorOpen: open } })),

  setRightPanelTab: (tab) =>
    set((s) => ({
      panels: { ...s.panels, rightPanelTab: tab, inspectorOpen: true },
    })),

  toggleRightPanel: () =>
    set((s) => ({
      panels: { ...s.panels, isRightPanelOpen: !s.panels.isRightPanelOpen },
    })),

  setRightPanelOpen: (open) =>
    set((s) => ({
      panels: { ...s.panels, isRightPanelOpen: open },
    })),

  toggleSplitPreview: () =>
    set((s) => {
      const next = !s.panels.splitPreviewOpen;
      return {
        panels: {
          ...s.panels,
          splitPreviewOpen: next,
          ...(next ? { isRightPanelOpen: false } : {}),
        },
      };
    }),

  setSplitPreviewOpen: (open) =>
    set((s) => ({
      panels: {
        ...s.panels,
        splitPreviewOpen: open,
        ...(open ? { isRightPanelOpen: false } : {}),
      },
    })),

  openExportModal: (target) =>
    set((s) => ({
      pendingExport: target ?? null,
      panels: { ...s.panels, exportModalOpen: true },
    })),

  closeExportModal: () =>
    set((s) => ({
      panels: { ...s.panels, exportModalOpen: false },
      pendingExport: null,
    })),

  openProjectManagerModal: () =>
    set((s) => ({
      panels: { ...s.panels, projectManagerModalOpen: true },
    })),

  closeProjectManagerModal: () =>
    set((s) => ({
      panels: { ...s.panels, projectManagerModalOpen: false },
    })),
});
