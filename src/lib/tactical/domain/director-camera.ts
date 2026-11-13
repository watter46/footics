import type {
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import type {
  ActionCameraCue,
  DirectorCameraTrack,
  GlobalCameraKeyframe,
} from '@/lib/types/tactical/project';
import type { Easing } from '@/lib/types/tactical/slide';
import type { TacticalCommand } from './commands';

const SNAP_THRESHOLD_MS = 150;

const normalizeYaw = (yaw: number): number => ((yaw % 360) + 360) % 360;
const clampTilt = (tilt: number): number => Math.max(0, Math.min(65, tilt));
const clampZoom = (zoom: number): number => Math.max(0.4, Math.min(3.0, zoom));

export function upsertGlobalCameraKeyframeInPhase(
  phase: DomainTacticalPhase,
  params: {
    readonly timeMs: number;
    readonly patch: {
      readonly tilt?: number;
      readonly yaw?: number;
      readonly easing?: Easing;
    };
    readonly keyframeId?: string;
    readonly activeSlideId?: string;
  },
): DomainTacticalPhase {
  const track: DirectorCameraTrack = phase.directorCamera ?? {
    enabled: true,
    globalKeyframes: [],
    actionCues: [],
  };
  const globalKeyframes: GlobalCameraKeyframe[] = [...track.globalKeyframes];

  const targetIdx =
    params.keyframeId !== undefined
      ? globalKeyframes.findIndex((kf) => kf.id === params.keyframeId)
      : globalKeyframes.findIndex(
          (kf) => Math.abs(kf.timeMs - params.timeMs) <= SNAP_THRESHOLD_MS,
        );

  if (targetIdx >= 0) {
    const existing = globalKeyframes[targetIdx];
    const nextTimeMs =
      params.keyframeId !== undefined && params.timeMs >= 0
        ? Math.round(params.timeMs)
        : existing.timeMs;
    globalKeyframes[targetIdx] = {
      ...existing,
      timeMs: nextTimeMs,
      tilt:
        params.patch.tilt !== undefined
          ? clampTilt(params.patch.tilt)
          : existing.tilt,
      yaw:
        params.patch.yaw !== undefined
          ? normalizeYaw(params.patch.yaw)
          : existing.yaw,
      easing: params.patch.easing ?? existing.easing,
    };
  } else {
    if (globalKeyframes.length === 0 && params.timeMs > SNAP_THRESHOLD_MS) {
      const refSlide =
        phase.slides.find((sl) => sl.id === params.activeSlideId) ??
        phase.slides[0];
      globalKeyframes.push({
        id: 'gkf-init-0',
        timeMs: 0,
        tilt: clampTilt(refSlide?.pitchTransform?.tilt ?? 0),
        yaw: normalizeYaw(refSlide?.pitchTransform?.yaw ?? 90),
        easing: 'ease-in-out',
      });
    }
    globalKeyframes.push({
      id: params.keyframeId ?? crypto.randomUUID(),
      timeMs: Math.max(0, Math.round(params.timeMs)),
      tilt: clampTilt(params.patch.tilt ?? 0),
      yaw: params.patch.yaw !== undefined ? normalizeYaw(params.patch.yaw) : 90,
      easing: params.patch.easing ?? 'ease-in-out',
    });
  }

  globalKeyframes.sort((a, b) => a.timeMs - b.timeMs);

  return {
    ...phase,
    directorCamera: {
      ...track,
      enabled: true,
      globalKeyframes,
      actionCues: track.actionCues,
    },
  };
}

export function deleteGlobalCameraKeyframeInPhase(
  phase: DomainTacticalPhase,
  keyframeId: string,
): DomainTacticalPhase {
  if (!phase.directorCamera) return phase;
  const globalKeyframes = phase.directorCamera.globalKeyframes.filter(
    (kf) => kf.id !== keyframeId,
  );
  if (globalKeyframes.length === phase.directorCamera.globalKeyframes.length) {
    return phase;
  }
  return {
    ...phase,
    directorCamera: { ...phase.directorCamera, globalKeyframes },
  };
}

function findMatchingCueIndex(
  cues: readonly ActionCameraCue[],
  startTimeMs: number,
  cueId?: string,
): number {
  if (cueId !== undefined) return cues.findIndex((c) => c.id === cueId);
  let targetIdx = -1;
  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    const cueEnd =
      c.startTimeMs +
      (c.durationMs ?? 1000) +
      (c.autoReturn ? (c.holdMs ?? 0) + (c.returnDurationMs ?? 800) : 0);
    if (
      startTimeMs >= c.startTimeMs - SNAP_THRESHOLD_MS &&
      startTimeMs <= cueEnd + SNAP_THRESHOLD_MS
    ) {
      const dist = Math.abs(c.startTimeMs - startTimeMs);
      if (dist < minDistance) {
        minDistance = dist;
        targetIdx = i;
      }
    }
  }
  return targetIdx;
}

export function upsertActionCameraCueInPhase(
  phase: DomainTacticalPhase,
  params: {
    readonly startTimeMs: number;
    readonly patch: Partial<Omit<ActionCameraCue, 'id'>>;
    readonly cueId?: string;
  },
): DomainTacticalPhase {
  const track: DirectorCameraTrack = phase.directorCamera ?? {
    enabled: true,
    globalKeyframes: [],
    actionCues: [],
  };
  const actionCues: ActionCameraCue[] = [...track.actionCues];
  const targetIdx = findMatchingCueIndex(
    actionCues,
    params.startTimeMs,
    params.cueId,
  );

  if (targetIdx >= 0) {
    const existing = actionCues[targetIdx];
    actionCues[targetIdx] = {
      ...existing,
      startTimeMs:
        params.patch.startTimeMs !== undefined
          ? Math.max(0, Math.round(params.patch.startTimeMs))
          : existing.startTimeMs,
      durationMs:
        params.patch.durationMs !== undefined
          ? Math.max(100, params.patch.durationMs)
          : existing.durationMs,
      transitionInMs:
        params.patch.transitionInMs !== undefined
          ? Math.max(0, params.patch.transitionInMs)
          : existing.transitionInMs,
      holdMs:
        params.patch.holdMs !== undefined
          ? Math.max(0, params.patch.holdMs)
          : existing.holdMs,
      returnDurationMs:
        params.patch.returnDurationMs !== undefined
          ? Math.max(100, params.patch.returnDurationMs)
          : existing.returnDurationMs,
      zoom:
        params.patch.zoom !== undefined
          ? clampZoom(params.patch.zoom)
          : existing.zoom,
      panX: params.patch.panX ?? existing.panX,
      panY: params.patch.panY ?? existing.panY,
      autoReturn: params.patch.autoReturn ?? existing.autoReturn,
      easing: params.patch.easing ?? existing.easing,
    };
  } else {
    actionCues.push({
      id: params.cueId ?? crypto.randomUUID(),
      startTimeMs: Math.max(0, Math.round(params.startTimeMs)),
      durationMs: Math.max(100, params.patch.durationMs ?? 1000),
      ...(params.patch.transitionInMs !== undefined
        ? { transitionInMs: Math.max(0, params.patch.transitionInMs) }
        : {}),
      holdMs: Math.max(0, params.patch.holdMs ?? 0),
      returnDurationMs: Math.max(100, params.patch.returnDurationMs ?? 800),
      zoom: clampZoom(params.patch.zoom ?? 1.3),
      panX: params.patch.panX ?? 0,
      panY: params.patch.panY ?? 0,
      autoReturn: params.patch.autoReturn ?? false,
      easing: params.patch.easing ?? 'ease-in-out',
    });
  }

  actionCues.sort((a, b) => a.startTimeMs - b.startTimeMs);
  return {
    ...phase,
    directorCamera: {
      ...track,
      enabled: true,
      globalKeyframes: track.globalKeyframes,
      actionCues,
    },
  };
}

export function deleteActionCameraCueInPhase(
  phase: DomainTacticalPhase,
  cueId: string,
): DomainTacticalPhase {
  if (!phase.directorCamera) return phase;
  const actionCues = phase.directorCamera.actionCues.filter(
    (c) => c.id !== cueId,
  );
  if (actionCues.length === phase.directorCamera.actionCues.length) {
    return phase;
  }
  return {
    ...phase,
    directorCamera: { ...phase.directorCamera, actionCues },
  };
}

export type DirectorCameraCommand = Extract<
  TacticalCommand,
  {
    type:
      | 'UPSERT_GLOBAL_CAMERA_KEYFRAME'
      | 'DELETE_GLOBAL_CAMERA_KEYFRAME'
      | 'UPSERT_ACTION_CAMERA_CUE'
      | 'DELETE_ACTION_CAMERA_CUE';
  }
>;

export function handleDirectorCameraCommand(
  project: DomainTacticalProject,
  command: DirectorCameraCommand,
  now: string,
): DomainTacticalProject {
  const targetPhase = project.phases.find((p) => p.id === command.phaseId);
  if (!targetPhase) return project;

  let updatedPhase: DomainTacticalPhase;
  switch (command.type) {
    case 'UPSERT_GLOBAL_CAMERA_KEYFRAME':
      updatedPhase = upsertGlobalCameraKeyframeInPhase(targetPhase, command);
      break;
    case 'DELETE_GLOBAL_CAMERA_KEYFRAME':
      updatedPhase = deleteGlobalCameraKeyframeInPhase(
        targetPhase,
        command.keyframeId,
      );
      break;
    case 'UPSERT_ACTION_CAMERA_CUE':
      updatedPhase = upsertActionCameraCueInPhase(targetPhase, command);
      break;
    case 'DELETE_ACTION_CAMERA_CUE':
      updatedPhase = deleteActionCameraCueInPhase(targetPhase, command.cueId);
      break;
  }

  if (updatedPhase === targetPhase) return project;
  return {
    ...project,
    phases: project.phases.map((p) =>
      p.id === command.phaseId ? updatedPhase : p,
    ),
    updatedAt: now,
  };
}
