import type { StateCreator } from 'zustand';
import type { FormationMode, FormationType } from '@/lib/data/formations';
import type { FormationPreset, Player } from '@/lib/types/tactical-unified';
import {
  createDefaultPlayer,
  isVerticalAspectRatio,
  transformCoord,
} from '@/lib/types/tactical-unified';
import {
  computeSlideAfterFormation,
  computeSlideAfterSingleTeamFormation,
} from './slide-formation-helpers';
import { recordHistory, updateSlideInProject } from './store-helpers';
import type { TacticalUnifiedState } from './tactical-unified-store';

export interface SlideFormationSlice {
  applyFormationPreset: (preset: FormationPreset, slideId: string) => void;
  applyFormation: (
    slideId: string,
    formationName: FormationType,
    mode: FormationMode,
    team: 'home' | 'away',
  ) => void;
  applySingleTeamFormation: (
    slideId: string,
    formationName: FormationType,
    mode: FormationMode,
    team: 'home' | 'away',
  ) => void;
}

export const createSlideFormationSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  SlideFormationSlice
> = (set) => ({
  applyFormationPreset: (preset, slideId) =>
    set((s) => {
      const primaryColor =
        preset.team === 'home'
          ? s.project.homeColor.primary
          : preset.team === 'away'
            ? s.project.awayColor.primary
            : '#6b7280';
      const targetSlide = s.project.slides.find((sl) => sl.id === slideId);
      const aspect =
        targetSlide?.aspectRatio ?? s.project.aspectRatio ?? '16:9';
      const isVertical = isVerticalAspectRatio(aspect);
      const newPlayers: Player[] = preset.players.map((pp) => {
        const rawPos = { x: pp.x, y: pp.y };
        const pos = isVertical
          ? transformCoord(rawPos, '16:9', aspect)
          : rawPos;
        return {
          ...createDefaultPlayer(preset.team, pos.x, pos.y, primaryColor),
          shirtNo: pp.shirtNo,
          position: pp.position,
        };
      });
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: [
            ...sl.players.filter((p) => p.team !== preset.team),
            ...newPlayers,
          ],
        })),
        isDirty: true,
      };
    }),

  applyFormation: (slideId, formationName, mode, team) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) =>
        computeSlideAfterFormation(sl, s.project, formationName, mode, team),
      ),
      isDirty: true,
    })),

  applySingleTeamFormation: (slideId, formationName, mode, team) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) =>
        computeSlideAfterSingleTeamFormation(
          sl,
          s.project,
          formationName,
          mode,
          team,
        ),
      ),
      isDirty: true,
    })),
});
