import type { StateCreator } from 'zustand';
import type { TacticalUnifiedState } from './tactical-unified-store';
import type {
  DrawingTool,
  ExportTarget,
  MarkerOptionTab,
  PanelState,
  SelectedObject,
  SelectedObjectKind,
  ToolSlice,
  WorkspaceMode,
} from './tool-types';

export type {
  DrawingTool,
  ExportTarget,
  MarkerOptionTab,
  PanelState,
  SelectedObject,
  SelectedObjectKind,
  ToolSlice,
  WorkspaceMode,
};

function transitionWorkspaceMode(
  s: TacticalUnifiedState,
  targetMode: WorkspaceMode,
): Partial<TacticalUnifiedState> {
  if (s.workspaceMode === targetMode) return s;
  if (targetMode === 'director') {
    return {
      workspaceMode: 'director',
      savedPanelStateBeforeDirector: {
        sidebarOpen: s.panels.sidebarOpen,
        isRightPanelOpen: s.panels.isRightPanelOpen,
      },
      panels: {
        ...s.panels,
        sidebarOpen: false,
        isRightPanelOpen: false,
      },
    };
  }
  const restored = s.savedPanelStateBeforeDirector;
  return {
    workspaceMode: 'board',
    savedPanelStateBeforeDirector: null,
    panels: {
      ...s.panels,
      ...(restored
        ? {
            sidebarOpen: restored.sidebarOpen,
            isRightPanelOpen: restored.isRightPanelOpen,
          }
        : {}),
    },
  };
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
  workspaceMode: 'board',
  savedPanelStateBeforeDirector: null,
  panels: {
    sidebarOpen: false,
    inspectorOpen: true,
    rightPanelTab: 'formation',
    isRightPanelOpen: false,
    splitPreviewOpen: false,
    exportModalOpen: false,
    projectManagerModalOpen: false,
  },

  setWorkspaceMode: (mode) => set((s) => transitionWorkspaceMode(s, mode)),

  toggleWorkspaceMode: () =>
    set((s) =>
      transitionWorkspaceMode(
        s,
        s.workspaceMode === 'board' ? 'director' : 'board',
      ),
    ),

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
