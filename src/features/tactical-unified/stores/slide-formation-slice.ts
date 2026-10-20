import type { StateCreator } from 'zustand';
import type { FormationMode, FormationType } from '@/lib/data/formations';
import {
  getPitchRectNormalized,
  mapPlayersToPitchRect,
  pitchToStageCoord,
} from '@/lib/tactical/pitch-stage-mapping';
import type {
  FormationPreset,
  Player,
  Slide,
} from '@/lib/types/tactical-unified';
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

/** 直前に再配置された team のピッチ上マーカー(ピッチ基準座標)を Stage 座標へ写像 */
function fitTeamPitchPlayers(
  slide: Slide,
  team: 'home' | 'away',
  s: TacticalUnifiedState,
): Slide {
  const aspect = slide.aspectRatio ?? s.project.aspectRatio ?? '16:9';
  const rect = getPitchRectNormalized(s.stageAspect, aspect);
  return {
    ...slide,
    players: slide.players.map((p) =>
      p.team === team && p.area === 'pitch'
        ? { ...p, ...pitchToStageCoord(p, rect) }
        : p,
    ),
  };
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
      const rect = getPitchRectNormalized(s.stageAspect, aspect);
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: [
            ...sl.players.filter((p) => p.team !== preset.team),
            ...mapPlayersToPitchRect(newPlayers, rect),
          ],
        })),
        isDirty: true,
      };
    }),

  applyFormation: (slideId, formationName, mode, team) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) =>
        fitTeamPitchPlayers(
          computeSlideAfterFormation(sl, s.project, formationName, mode, team),
          team,
          s,
        ),
      ),
      isDirty: true,
    })),

  applySingleTeamFormation: (slideId, formationName, mode, team) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) =>
        fitTeamPitchPlayers(
          computeSlideAfterSingleTeamFormation(
            sl,
            s.project,
            formationName,
            mode,
            team,
          ),
          team,
          s,
        ),
      ),
      isDirty: true,
    })),
});
