import { createStore, type StoreApi } from 'zustand';
import type {
  EphemeralDragDelta,
  EphemeralSessionState,
  EphemeralZoneRotation,
} from '@/lib/tactical/compiler/scene-graph-dto';
import {
  DEFAULT_SESSION_UI_STATE,
  type DomainTacticalClipboard,
  type DrawingTool,
  type ExportTarget,
  type MarkerMode,
  type MarkerOptionTab,
  type RightPanelTab,
  type SaveStatus,
  type SelectedObject,
  type SessionUiState,
  type TeamVisibility,
  type WorkspaceMode,
} from './session-ui-state';
import {
  CLEARED_SELECTION,
  selectObjectsTransition,
  selectObjectTransition,
  splitPreviewTransition,
  transitionWorkspaceMode,
} from './session-ui-transitions';

export interface SessionStoreState extends SessionUiState {
  readonly activePhaseId: string;
  readonly activeSlideId: string;
  readonly activeDragDelta: EphemeralDragDelta | null;
  readonly activeZoneRotation: EphemeralZoneRotation | null;
  readonly drawingPreview: EphemeralSessionState['drawingPreview'] | null;

  readonly setActivePhaseId: (phaseId: string) => void;
  readonly setActiveSlideId: (slideId: string) => void;
  readonly setActiveDragDelta: (delta: EphemeralDragDelta | null) => void;
  readonly setActiveZoneRotation: (rot: EphemeralZoneRotation | null) => void;
  readonly setDrawingPreview: (
    preview: EphemeralSessionState['drawingPreview'] | null,
  ) => void;
  readonly resetSession: (init?: Partial<SessionStoreState>) => void;

  readonly setActiveTool: (tool: DrawingTool) => void;
  readonly setContinuousDrawing: (val: boolean) => void;
  readonly toggleContinuousDrawing: () => void;
  readonly setColor: (color: string) => void;
  readonly setCustomColor: (color: string) => void;
  readonly setStrokeWidth: (width: number) => void;
  readonly setFontSize: (size: number) => void;
  readonly setMarkerMode: (mode: MarkerMode) => void;
  readonly setIsDragging: (dragging: boolean) => void;
  readonly setIsHudOpen: (open: boolean) => void;
  readonly setConnectingPlayerId: (id: string | null) => void;
  readonly setActiveMarkerOptionTab: (tab: MarkerOptionTab | null) => void;
  readonly setTeamVisibility: (visibility: TeamVisibility) => void;
  readonly setClipboard: (clipboard: DomainTacticalClipboard | null) => void;

  readonly selectObject: (obj: SelectedObject | null, multi?: boolean) => void;
  readonly selectObjects: (
    objects: readonly SelectedObject[],
    multi?: boolean,
  ) => void;
  readonly clearSelection: () => void;

  readonly setWorkspaceMode: (mode: WorkspaceMode) => void;
  readonly toggleWorkspaceMode: () => void;
  readonly toggleSidebar: () => void;
  readonly setSidebarOpen: (open: boolean) => void;
  readonly setInspectorOpen: (open: boolean) => void;
  readonly setRightPanelTab: (tab: RightPanelTab) => void;
  readonly toggleRightPanel: () => void;
  readonly setRightPanelOpen: (open: boolean) => void;
  readonly toggleSplitPreview: () => void;
  readonly setSplitPreviewOpen: (open: boolean) => void;
  readonly openExportModal: (target?: ExportTarget) => void;
  readonly closeExportModal: () => void;
  readonly openProjectManagerModal: () => void;
  readonly closeProjectManagerModal: () => void;
  readonly setSaveStatus: (status: SaveStatus) => void;
  readonly setLastSavedAt: (timestamp: number | null) => void;
  readonly setIsExporting: (exporting: boolean) => void;
  readonly setStageAspect: (aspect: number | null) => void;
}

export type SessionStore = StoreApi<SessionStoreState>;

export type CreateSessionStoreOptions = Partial<SessionUiState> & {
  activePhaseId?: string;
  activeSlideId?: string;
  activeDragDelta?: EphemeralDragDelta | null;
  activeZoneRotation?: EphemeralZoneRotation | null;
  drawingPreview?: EphemeralSessionState['drawingPreview'] | null;
};

export function createSessionStore(
  initial?: CreateSessionStoreOptions,
): SessionStore {
  const {
    activePhaseId,
    activeSlideId,
    activeDragDelta,
    activeZoneRotation,
    drawingPreview,
    ...initialUi
  } = initial ?? {};

  return createStore<SessionStoreState>((set) => ({
    ...DEFAULT_SESSION_UI_STATE,
    ...initialUi,
    activePhaseId: activePhaseId ?? '',
    activeSlideId: activeSlideId ?? '',
    activeDragDelta: activeDragDelta ?? null,
    activeZoneRotation: activeZoneRotation ?? null,
    drawingPreview: drawingPreview ?? null,

    setActivePhaseId: (phaseId: string) => set({ activePhaseId: phaseId }),
    setActiveSlideId: (slideId: string) => set({ activeSlideId: slideId }),
    setActiveDragDelta: (delta: EphemeralDragDelta | null) =>
      set({ activeDragDelta: delta }),
    setActiveZoneRotation: (rot: EphemeralZoneRotation | null) =>
      set({ activeZoneRotation: rot }),
    setDrawingPreview: (
      preview: EphemeralSessionState['drawingPreview'] | null,
    ) => set({ drawingPreview: preview }),
    resetSession: (init?: Partial<SessionStoreState>) =>
      set((state) => ({
        ...state,
        activeDragDelta: null,
        activeZoneRotation: null,
        drawingPreview: null,
        ...init,
      })),

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
    setIsDragging: (isDragging) =>
      set((s) => (s.isDragging === isDragging ? s : { isDragging })),
    setIsHudOpen: (isHudOpen) =>
      set((s) => (s.isHudOpen === isHudOpen ? s : { isHudOpen })),
    setConnectingPlayerId: (id) => set({ connectingPlayerId: id }),
    setActiveMarkerOptionTab: (tab) => set({ activeMarkerOptionTab: tab }),
    setTeamVisibility: (visibility) => set({ teamVisibility: visibility }),
    setClipboard: (clipboard) => set({ clipboard }),

    selectObject: (obj, multi = false) =>
      set((s) => selectObjectTransition(s, obj, multi)),
    selectObjects: (objects, multi = false) =>
      set((s) => selectObjectsTransition(s, objects, multi)),
    clearSelection: () => set({ ...CLEARED_SELECTION }),

    setWorkspaceMode: (mode) =>
      set((s) =>
        s.workspaceMode === mode ? s : transitionWorkspaceMode(s, mode),
      ),
    toggleWorkspaceMode: () =>
      set((s) =>
        transitionWorkspaceMode(
          s,
          s.workspaceMode === 'board' ? 'director' : 'board',
        ),
      ),
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
      set((s) => ({ panels: { ...s.panels, isRightPanelOpen: open } })),
    toggleSplitPreview: () =>
      set((s) => splitPreviewTransition(s.panels, !s.panels.splitPreviewOpen)),
    setSplitPreviewOpen: (open) =>
      set((s) => splitPreviewTransition(s.panels, open)),
    openExportModal: (target) =>
      set((s) => ({
        pendingExport: target ?? null,
        panels: { ...s.panels, exportModalOpen: true },
      })),
    closeExportModal: () =>
      set((s) => ({
        pendingExport: null,
        panels: { ...s.panels, exportModalOpen: false },
      })),
    openProjectManagerModal: () =>
      set((s) => ({ panels: { ...s.panels, projectManagerModalOpen: true } })),
    closeProjectManagerModal: () =>
      set((s) => ({ panels: { ...s.panels, projectManagerModalOpen: false } })),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
    setLastSavedAt: (lastSavedAt) => set({ lastSavedAt }),
    setIsExporting: (isExporting) => set({ isExporting }),
    setStageAspect: (stageAspect) => set({ stageAspect }),
  }));
}
