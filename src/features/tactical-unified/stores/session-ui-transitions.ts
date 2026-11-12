import type {
  PanelState,
  SelectedObject,
  SessionUiState,
  WorkspaceMode,
} from './session-ui-state';

export const CLEARED_SELECTION: Pick<
  SessionUiState,
  'selectedObjects' | 'activeMarkerOptionTab'
> = {
  selectedObjects: [],
  activeMarkerOptionTab: null,
};

export function transitionWorkspaceMode(
  s: Pick<
    SessionUiState,
    'workspaceMode' | 'panels' | 'savedPanelStateBeforeDirector'
  >,
  targetMode: WorkspaceMode,
): Partial<SessionUiState> {
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
        rightPanelTab: 'camera',
        isRightPanelOpen: true,
      },
    };
  }
  const restored = s.savedPanelStateBeforeDirector;
  return {
    workspaceMode: 'board',
    savedPanelStateBeforeDirector: null,
    panels: {
      ...s.panels,
      rightPanelTab: 'formation',
      ...(restored
        ? {
            sidebarOpen: restored.sidebarOpen,
            isRightPanelOpen: restored.isRightPanelOpen,
          }
        : {}),
    },
  };
}

export function selectObjectTransition(
  s: Pick<SessionUiState, 'selectedObjects'>,
  obj: SelectedObject | null,
  multi: boolean,
): Partial<SessionUiState> {
  if (!obj) return { ...CLEARED_SELECTION };
  if (multi) {
    const already = s.selectedObjects.some((o) => o.id === obj.id);
    return {
      selectedObjects: already
        ? s.selectedObjects.filter((o) => o.id !== obj.id)
        : [...s.selectedObjects, obj],
      isHudOpen: true,
    };
  }
  return { selectedObjects: [obj], isHudOpen: true };
}

export function selectObjectsTransition(
  s: Pick<SessionUiState, 'selectedObjects'>,
  objects: readonly SelectedObject[],
  multi: boolean,
): Partial<SessionUiState> {
  if (objects.length === 0 && !multi) return { ...CLEARED_SELECTION };
  if (multi) {
    const existingIds = new Set(s.selectedObjects.map((o) => o.id));
    const newItems = objects.filter((o) => !existingIds.has(o.id));
    return { selectedObjects: [...s.selectedObjects, ...newItems] };
  }
  const single = objects.length === 1 ? objects[0] : undefined;
  return {
    selectedObjects: objects,
    activeMarkerOptionTab: single?.kind === 'player' ? 'vision' : null,
    ...(single ? { isHudOpen: true } : {}),
  };
}

export function splitPreviewTransition(
  panels: PanelState,
  open: boolean,
): Partial<SessionUiState> {
  return {
    panels: {
      ...panels,
      splitPreviewOpen: open,
      ...(open ? { isRightPanelOpen: false } : {}),
    },
  };
}
