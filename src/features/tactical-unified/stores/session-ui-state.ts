import type { DomainTacticalClipboard } from '@/lib/tactical/domain/clipboard';
import type {
  DrawingTool,
  ExportTarget,
} from '@/lib/types/tactical/project-config';

export type { DomainTacticalClipboard, DrawingTool, ExportTarget };

export type WorkspaceMode = 'board' | 'director';

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

export type RightPanelTab =
  | 'formation'
  | 'squad'
  | 'pitch'
  | 'camera'
  | 'screen';

export interface PanelState {
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  rightPanelTab: RightPanelTab;
  isRightPanelOpen: boolean;
  splitPreviewOpen?: boolean;
  exportModalOpen: boolean;
  projectManagerModalOpen: boolean;
}

export type TeamVisibility = 'both' | 'home' | 'away';
export type MarkerMode = '2d-only' | '3d-only' | 'all';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SavedPanelState {
  sidebarOpen: boolean;
  isRightPanelOpen: boolean;
}

/** 更新頻度が高く永続化しない画面状態（SessionStore が保持する Hot State）。 */
export interface SessionUiState {
  readonly activeTool: DrawingTool;
  readonly continuousDrawing: boolean;
  readonly selectedObjects: readonly SelectedObject[];
  readonly connectingPlayerId: string | null;
  readonly activeMarkerOptionTab: MarkerOptionTab | null;
  readonly isDragging: boolean;
  readonly isHudOpen: boolean;
  readonly color: string;
  readonly strokeWidth: number;
  readonly fontSize: number;
  readonly customColor: string;
  readonly markerMode: MarkerMode;
  readonly teamVisibility: TeamVisibility;
  readonly clipboard: DomainTacticalClipboard | null;
  readonly panels: PanelState;
  readonly workspaceMode: WorkspaceMode;
  readonly savedPanelStateBeforeDirector: SavedPanelState | null;
  readonly pendingExport: ExportTarget | null;
  readonly saveStatus: SaveStatus;
  readonly lastSavedAt: number | null;
  readonly isExporting: boolean;
  readonly stageAspect: number | null;
}

export const DEFAULT_SESSION_UI_STATE: SessionUiState = {
  activeTool: 'select',
  continuousDrawing: false,
  selectedObjects: [],
  connectingPlayerId: null,
  activeMarkerOptionTab: null,
  isDragging: false,
  isHudOpen: true,
  color: '#ffffff',
  strokeWidth: 2,
  fontSize: 14,
  customColor: '#ffffff',
  markerMode: 'all',
  teamVisibility: 'both',
  clipboard: null,
  panels: {
    sidebarOpen: false,
    inspectorOpen: true,
    rightPanelTab: 'formation',
    isRightPanelOpen: false,
    splitPreviewOpen: false,
    exportModalOpen: false,
    projectManagerModalOpen: false,
  },
  workspaceMode: 'board',
  savedPanelStateBeforeDirector: null,
  pendingExport: null,
  saveStatus: 'idle',
  lastSavedAt: null,
  isExporting: false,
  stageAspect: null,
};
