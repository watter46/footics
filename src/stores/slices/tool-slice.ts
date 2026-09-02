import type { StateCreator } from 'zustand';
import type { DrawingTool, ExportTarget } from '@/lib/types/tactical-unified';
import type { TacticalUnifiedState } from '../tactical-unified-store';

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
  rightPanelTab: 'formation' | 'squad' | 'inspector';
  isRightPanelOpen: boolean;
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

  // ── 表示制御
  teamVisibility: 'both' | 'home' | 'away';
  panels: PanelState;

  // ── アクション
  setActiveTool: (tool: DrawingTool) => void;
  setContinuousDrawing: (val: boolean) => void;
  toggleContinuousDrawing: () => void;
  selectObject: (obj: SelectedObject | null, multi?: boolean) => void;
  selectObjects: (objects: SelectedObject[], multi?: boolean) => void;
  clearSelection: () => void;
  setActiveMarkerOptionTab: (tab: MarkerOptionTab | null) => void;
  setConnectingPlayerId: (id: string | null) => void;
  setTeamVisibility: (visibility: 'both' | 'home' | 'away') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  setRightPanelTab: (tab: 'formation' | 'squad' | 'inspector') => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
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
  teamVisibility: 'both',
  panels: {
    sidebarOpen: false,
    inspectorOpen: true,
    rightPanelTab: 'formation',
    isRightPanelOpen: false,
    exportModalOpen: false,
    projectManagerModalOpen: false,
  },

  setActiveTool: (tool) => set({ activeTool: tool }),

  setContinuousDrawing: (val) => set({ continuousDrawing: val }),

  toggleContinuousDrawing: () =>
    set((s) => ({ continuousDrawing: !s.continuousDrawing })),

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
          panels: {
            ...s.panels,
            inspectorOpen: true,
            rightPanelTab: 'inspector',
          },
        };
      }
      return {
        selectedObjects: [obj],
        panels: {
          ...s.panels,
          inspectorOpen: true,
          rightPanelTab: 'inspector',
        },
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
          panels: {
            ...s.panels,
            inspectorOpen: objects.length > 0 || s.selectedObjects.length > 0,
            rightPanelTab: 'inspector',
          },
        };
      }
      return {
        selectedObjects: objects,
        activeMarkerOptionTab:
          objects.length === 1 && objects[0].kind === 'player'
            ? 'vision'
            : null,
        panels: {
          ...s.panels,
          inspectorOpen: objects.length > 0,
          rightPanelTab: 'inspector',
        },
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
