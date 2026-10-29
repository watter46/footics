import type { StateCreator } from 'zustand';
import type {
  AspectRatio,
  ExportTarget,
  PitchAppearanceConfig,
  TacticalProject,
} from '@/lib/types/tactical-unified';
import { createDefaultProject } from '@/lib/types/tactical-unified';
import {
  createProjectConfigActions,
  createProjectMetaActions,
  type ProjectSliceSet,
} from './project-slice-actions';
import type { TacticalUnifiedState } from './tactical-unified-store';
import type { SelectedObjectKind } from './tool-slice';

export {
  createProjectConfigActions,
  createProjectMetaActions,
} from './project-slice-actions';

export interface ProjectSlice {
  project: TacticalProject;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: number | null;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  setLastSavedAt: (timestamp: number | null) => void;
  activePhaseId: string;
  activeSlideId: string;
  /** Stage(コンテナ全面)の width/height。未計測は null（非永続・履歴対象外） */
  stageAspect: number | null;
  /** 既定配置(ピッチ基準)が Stage 座標へ未写像か。初回計測時に一度だけ写像する */
  pitchFitPending: boolean;
  setStageAspect: (aspect: number) => void;
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlayback: () => void;
  stopPlayback: () => void;
  pendingExport: ExportTarget | null;
  isExporting: boolean;
  setIsExporting: (val: boolean) => void;
  loadProject: (project: TacticalProject) => void;
  resetProject: () => void;
  setTitle: (title: string) => void;
  setBackgroundType: (type: TacticalProject['backgroundType']) => void;
  setBackgroundImageUrl: (url: string | undefined) => void;
  updatePitchAppearance: (appearance: Partial<PitchAppearanceConfig>) => void;
  restoreDefaultPitch: () => void;
  setImageBackground: (url: string) => void;
  setTeamColor: (
    team: 'home' | 'away',
    primary: string,
    secondary?: string,
  ) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  swapTeamSides: (slideId?: string) => void;
  resetSlideObjects: (slideId?: string) => void;
  resetSlideKeepSquad: (slideId?: string) => void;
  toggleObjectLock: (objectId: string, kind: SelectedObjectKind) => void;
  deleteSelectedObjects: (slideId?: string) => void;
}

const INITIAL_PROJECT = createDefaultProject(crypto.randomUUID());

export const createProjectSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  ProjectSlice
> = (set) => {
  const setter: ProjectSliceSet = (partial) => {
    if (typeof partial === 'function') {
      set((s) => partial(s) as Partial<TacticalUnifiedState>);
    } else {
      set(partial as Partial<TacticalUnifiedState>);
    }
  };

  return {
    project: INITIAL_PROJECT,
    isDirty: false,
    saveStatus: 'idle',
    lastSavedAt: null,
    setSaveStatus: (status) => set({ saveStatus: status }),
    setLastSavedAt: (timestamp) => set({ lastSavedAt: timestamp }),
    activePhaseId: INITIAL_PROJECT.activePhaseId,
    activeSlideId: INITIAL_PROJECT.activeSlideId,
    stageAspect: null,
    pitchFitPending: true,
    isPlaying: false,
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    togglePlayback: () => set((s) => ({ isPlaying: !s.isPlaying })),
    stopPlayback: () => set({ isPlaying: false }),
    pendingExport: null,
    isExporting: false,
    setIsExporting: (val) => set({ isExporting: val }),
    ...createProjectMetaActions(setter),
    ...createProjectConfigActions(setter),
  };
};
