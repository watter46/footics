import type {
  ActionCameraCue,
  DirectorCameraTrack,
  Easing,
  GlobalCameraKeyframe,
  TacticalPhase,
  TacticalProject,
} from '@/lib/types/tactical-unified';
import { attachSlidesGetter, recordHistory } from './store-helpers';

interface DirectorStoreState {
  project: TacticalProject;
  activePhaseId?: string;
  activeSlideId?: string;
  past: TacticalPhase[][];
  future?: TacticalPhase[][];
  isDirty?: boolean;
}

type SetState = (
  updater: (state: DirectorStoreState) => Partial<DirectorStoreState>,
) => void;

export function updatePhaseInProject(
  project: TacticalProject,
  phaseId: string,
  updater: (phase: TacticalPhase) => TacticalPhase,
): TacticalProject {
  const nextPhases = project.phases.map((ph) =>
    ph.id === phaseId ? updater(ph) : ph,
  );
  return attachSlidesGetter({
    ...project,
    updatedAt: new Date().toISOString(),
    phases: nextPhases,
  });
}

export function createDirectorCameraActions(set: SetState) {
  return {
    upsertGlobalCameraKeyframe: (
      timeMs: number,
      patch: { tilt?: number; yaw?: number; easing?: Easing },
      keyframeId?: string,
    ) =>
      set((s) => {
        const targetPhaseId = s.activePhaseId || s.project.phases[0]?.id;
        if (!targetPhaseId) return s;
        const phase = s.project.phases.find((p) => p.id === targetPhaseId);
        if (!phase) return s;

        const directorCamera: DirectorCameraTrack = phase.directorCamera ?? {
          enabled: true,
          globalKeyframes: [],
          actionCues: [],
        };
        const globalKeyframes: GlobalCameraKeyframe[] = [
          ...(directorCamera.globalKeyframes ?? []),
        ];

        const targetIdx =
          keyframeId !== undefined
            ? globalKeyframes.findIndex((kf) => kf.id === keyframeId)
            : globalKeyframes.findIndex(
                (kf) => Math.abs(kf.timeMs - timeMs) <= 150,
              );

        if (targetIdx >= 0) {
          const existing = globalKeyframes[targetIdx];
          const nextTimeMs =
            keyframeId !== undefined && timeMs >= 0
              ? Math.round(timeMs)
              : existing.timeMs;
          globalKeyframes[targetIdx] = {
            ...existing,
            timeMs: nextTimeMs,
            tilt: patch.tilt ?? existing.tilt,
            yaw:
              patch.yaw !== undefined
                ? ((patch.yaw % 360) + 360) % 360
                : existing.yaw,
            easing: patch.easing ?? existing.easing,
          };
        } else {
          if (globalKeyframes.length === 0 && timeMs > 150) {
            const activeSlide =
              phase.slides.find((sl) => sl.id === s.activeSlideId) ??
              phase.slides[0];
            globalKeyframes.push({
              id: 'gkf-init-0',
              timeMs: 0,
              tilt: activeSlide?.pitchTransform?.tilt ?? 0,
              yaw: activeSlide?.pitchTransform?.yaw ?? 90,
              easing: 'ease-in-out',
            });
          }
          const newId =
            keyframeId ??
            `gkf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          globalKeyframes.push({
            id: newId,
            timeMs: Math.max(0, Math.round(timeMs)),
            tilt: patch.tilt ?? 0,
            yaw: patch.yaw !== undefined ? ((patch.yaw % 360) + 360) % 360 : 90,
            easing: patch.easing ?? 'ease-in-out',
          });
        }

        globalKeyframes.sort((a, b) => a.timeMs - b.timeMs);

        const nextDirectorCamera: DirectorCameraTrack = {
          ...directorCamera,
          enabled: true,
          globalKeyframes,
          actionCues: directorCamera.actionCues ?? [],
        };

        return {
          ...recordHistory(s),
          project: updatePhaseInProject(s.project, targetPhaseId, (ph) => ({
            ...ph,
            directorCamera: nextDirectorCamera,
          })),
          isDirty: true,
        };
      }),

    deleteGlobalCameraKeyframe: (keyframeId: string) =>
      set((s) => {
        const targetPhaseId = s.activePhaseId || s.project.phases[0]?.id;
        if (!targetPhaseId) return s;
        const phase = s.project.phases.find((p) => p.id === targetPhaseId);
        if (!phase || !phase.directorCamera) return s;

        const globalKeyframes = (
          phase.directorCamera.globalKeyframes ?? []
        ).filter((kf) => kf.id !== keyframeId);

        const nextDirectorCamera: DirectorCameraTrack = {
          ...phase.directorCamera,
          globalKeyframes,
        };

        return {
          ...recordHistory(s),
          project: updatePhaseInProject(s.project, targetPhaseId, (ph) => ({
            ...ph,
            directorCamera: nextDirectorCamera,
          })),
          isDirty: true,
        };
      }),

    upsertActionCameraCue: (
      startTimeMs: number,
      patch: Partial<Omit<ActionCameraCue, 'id'>>,
      cueId?: string,
    ) =>
      set((s) => {
        const targetPhaseId = s.activePhaseId || s.project.phases[0]?.id;
        if (!targetPhaseId) return s;
        const phase = s.project.phases.find((p) => p.id === targetPhaseId);
        if (!phase) return s;

        const directorCamera: DirectorCameraTrack = phase.directorCamera ?? {
          enabled: true,
          globalKeyframes: [],
          actionCues: [],
        };
        const actionCues: ActionCameraCue[] = [
          ...(directorCamera.actionCues ?? []),
        ];

        let targetIdx = -1;
        if (cueId !== undefined) {
          targetIdx = actionCues.findIndex((c) => c.id === cueId);
        } else {
          let minDistance = Infinity;
          for (let i = 0; i < actionCues.length; i++) {
            const c = actionCues[i];
            const cueEnd =
              c.startTimeMs +
              (c.durationMs ?? 1000) +
              (c.autoReturn
                ? (c.holdMs ?? 0) + (c.returnDurationMs ?? 800)
                : 0);
            if (
              startTimeMs >= c.startTimeMs - 150 &&
              startTimeMs <= cueEnd + 150
            ) {
              const dist = Math.abs(c.startTimeMs - startTimeMs);
              if (dist < minDistance) {
                minDistance = dist;
                targetIdx = i;
              }
            }
          }
        }

        if (targetIdx >= 0) {
          const existing = actionCues[targetIdx];
          actionCues[targetIdx] = {
            ...existing,
            startTimeMs:
              patch.startTimeMs !== undefined
                ? Math.max(0, Math.round(patch.startTimeMs))
                : existing.startTimeMs,
            durationMs: patch.durationMs ?? existing.durationMs,
            holdMs: patch.holdMs ?? existing.holdMs,
            returnDurationMs:
              patch.returnDurationMs ?? existing.returnDurationMs,
            zoom: patch.zoom ?? existing.zoom,
            panX: patch.panX ?? existing.panX,
            panY: patch.panY ?? existing.panY,
            autoReturn: patch.autoReturn ?? existing.autoReturn,
            easing: patch.easing ?? existing.easing,
          };
        } else {
          const newId =
            cueId ??
            `acue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          actionCues.push({
            id: newId,
            startTimeMs: Math.max(0, Math.round(startTimeMs)),
            durationMs: patch.durationMs ?? 1000,
            holdMs: patch.holdMs ?? 0,
            returnDurationMs: patch.returnDurationMs ?? 800,
            zoom: patch.zoom ?? 1.3,
            panX: patch.panX ?? 0,
            panY: patch.panY ?? 0,
            autoReturn: patch.autoReturn ?? false,
            easing: patch.easing ?? 'ease-in-out',
          });
        }

        actionCues.sort((a, b) => a.startTimeMs - b.startTimeMs);

        const nextDirectorCamera: DirectorCameraTrack = {
          ...directorCamera,
          enabled: true,
          globalKeyframes: directorCamera.globalKeyframes ?? [],
          actionCues,
        };

        return {
          ...recordHistory(s),
          project: updatePhaseInProject(s.project, targetPhaseId, (ph) => ({
            ...ph,
            directorCamera: nextDirectorCamera,
          })),
          isDirty: true,
        };
      }),

    deleteActionCameraCue: (cueId: string) =>
      set((s) => {
        const targetPhaseId = s.activePhaseId || s.project.phases[0]?.id;
        if (!targetPhaseId) return s;
        const phase = s.project.phases.find((p) => p.id === targetPhaseId);
        if (!phase || !phase.directorCamera) return s;

        const actionCues = (phase.directorCamera.actionCues ?? []).filter(
          (c) => c.id !== cueId,
        );

        const nextDirectorCamera: DirectorCameraTrack = {
          ...phase.directorCamera,
          actionCues,
        };

        return {
          ...recordHistory(s),
          project: updatePhaseInProject(s.project, targetPhaseId, (ph) => ({
            ...ph,
            directorCamera: nextDirectorCamera,
          })),
          isDirty: true,
        };
      }),
  };
}
