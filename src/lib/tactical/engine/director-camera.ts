import { applyEasing } from '@/lib/tactical/easing';
import type {
  DirectorCameraTrack,
  PitchTransform,
} from '@/lib/types/tactical-unified';

export {
  calculateUnifiedTotalDuration,
  type EffectiveSlideSegment,
  resolveEffectiveSlideSegments,
  resolvePlaybackDurationMs,
  type SlideTimingLike,
} from './slide-timing';

export interface InterpolatedPitchTransformState {
  panX: number;
  panY: number;
  zoom: number;
  tilt: number;
  yaw: number;
  isLocked: boolean;
}

export interface ResolveSyntheticDirectorCameraOptions {
  isEditing?: boolean;
  selectedCueId?: string | null;
}

export function hasCameraDelta(
  a?: PitchTransform | null,
  b?: PitchTransform | null,
): boolean {
  if (!a && !b) return false;
  return (
    Math.abs((a?.panX ?? 0) - (b?.panX ?? 0)) > 0.001 ||
    Math.abs((a?.panY ?? 0) - (b?.panY ?? 0)) > 0.001 ||
    Math.abs((a?.zoom ?? 1) - (b?.zoom ?? 1)) > 0.001 ||
    Math.abs((a?.tilt ?? 0) - (b?.tilt ?? 0)) > 0.001 ||
    Math.abs((a?.yaw ?? 90) - (b?.yaw ?? 90)) > 0.001
  );
}

export function interpolatePitchTransform(
  transformA?: PitchTransform | null,
  transformB?: PitchTransform | null,
  t = 0,
): InterpolatedPitchTransformState {
  const [panXA, panXB] = [transformA?.panX ?? 0, transformB?.panX ?? 0];
  const [panYA, panYB] = [transformA?.panY ?? 0, transformB?.panY ?? 0];
  const [zoomA, zoomB] = [transformA?.zoom ?? 1, transformB?.zoom ?? 1];
  const [tiltA, tiltB] = [transformA?.tilt ?? 0, transformB?.tilt ?? 0];
  const [yawA, yawB] = [transformA?.yaw ?? 90, transformB?.yaw ?? 90];
  const [lockedA, lockedB] = [
    transformA?.isLocked ?? false,
    transformB?.isLocked ?? false,
  ];

  let deltaYaw = ((((yawB - yawA) % 360) + 540) % 360) - 180;
  if (deltaYaw === -180 && yawB > yawA) deltaYaw = 180;
  const yaw = (((yawA + deltaYaw * t) % 360) + 360) % 360;

  return {
    panX: panXA + (panXB - panXA) * t,
    panY: panYA + (panYB - panYA) * t,
    zoom: zoomA + (zoomB - zoomA) * t,
    tilt: tiltA + (tiltB - tiltA) * t,
    yaw,
    isLocked: t < 0.5 ? lockedA : lockedB,
  };
}

export function hasActiveDirectorCameraTrack(
  track?: DirectorCameraTrack | null,
): track is DirectorCameraTrack {
  if (!track || !track.enabled) return false;
  return (
    (track.globalKeyframes?.length ?? 0) > 0 ||
    (track.actionCues?.length ?? 0) > 0
  );
}

export function resolveSyntheticDirectorCamera(
  track: DirectorCameraTrack,
  timeMs: number,
  options?: number | ResolveSyntheticDirectorCameraOptions,
): InterpolatedPitchTransformState {
  const opts: ResolveSyntheticDirectorCameraOptions =
    typeof options === 'number' ? {} : (options ?? {});
  const isEditing = opts.isEditing ?? false;
  const selectedCueId = opts.selectedCueId ?? null;

  const sortedKeyframes = [...(track.globalKeyframes ?? [])].sort(
    (a, b) => a.timeMs - b.timeMs,
  );
  let tilt = 0;
  let yaw = 90;

  if (sortedKeyframes.length === 1) {
    tilt = sortedKeyframes[0].tilt;
    yaw = sortedKeyframes[0].yaw;
  } else if (sortedKeyframes.length > 1) {
    if (timeMs <= sortedKeyframes[0].timeMs) {
      tilt = sortedKeyframes[0].tilt;
      yaw = sortedKeyframes[0].yaw;
    } else if (timeMs >= sortedKeyframes[sortedKeyframes.length - 1].timeMs) {
      const last = sortedKeyframes[sortedKeyframes.length - 1];
      tilt = last.tilt;
      yaw = last.yaw;
    } else {
      for (let i = 0; i < sortedKeyframes.length - 1; i++) {
        const kfA = sortedKeyframes[i];
        const kfB = sortedKeyframes[i + 1];
        if (timeMs >= kfA.timeMs && timeMs <= kfB.timeMs) {
          const span = Math.max(1, kfB.timeMs - kfA.timeMs);
          const rawT = (timeMs - kfA.timeMs) / span;
          const easeT = applyEasing(rawT, kfB.easing ?? 'ease-in-out');
          tilt = kfA.tilt + (kfB.tilt - kfA.tilt) * easeT;
          let deltaYaw = ((((kfB.yaw - kfA.yaw) % 360) + 540) % 360) - 180;
          if (deltaYaw === -180 && kfB.yaw > kfA.yaw) deltaYaw = 180;
          yaw = (((kfA.yaw + deltaYaw * easeT) % 360) + 360) % 360;
          break;
        }
      }
    }
  }

  const sortedCues = [...(track.actionCues ?? [])].sort(
    (a, b) => a.startTimeMs - b.startTimeMs,
  );
  let zoom = 1;
  let panX = 0;
  let panY = 0;

  if (isEditing) {
    const editingCue =
      (selectedCueId
        ? sortedCues.find((c) => c.id === selectedCueId)
        : undefined) ??
      sortedCues.find(
        (c) =>
          timeMs >= c.startTimeMs &&
          timeMs <= c.startTimeMs + (c.durationMs ?? 1000),
      );
    if (editingCue) {
      return {
        tilt,
        yaw,
        zoom: editingCue.zoom,
        panX: editingCue.panX,
        panY: editingCue.panY,
        isLocked: true,
      };
    }
  }

  for (const cue of sortedCues) {
    if (timeMs < cue.startTimeMs) break;
    const [fromZoom, fromPanX, fromPanY] = [zoom, panX, panY];
    const moveDur = Math.max(100, cue.durationMs ?? 1000);
    const moveEnd = cue.startTimeMs + moveDur;
    const transitionInMs = cue.transitionInMs ?? Math.min(250, moveDur * 0.3);

    if (timeMs <= moveEnd) {
      if (timeMs < cue.startTimeMs + transitionInMs) {
        const rawT = Math.min(
          1,
          Math.max(0, (timeMs - cue.startTimeMs) / Math.max(1, transitionInMs)),
        );
        const easeT = applyEasing(rawT, cue.easing ?? 'ease-in-out');
        zoom = fromZoom + (cue.zoom - fromZoom) * easeT;
        panX = fromPanX + (cue.panX - fromPanX) * easeT;
        panY = fromPanY + (cue.panY - fromPanY) * easeT;
      } else {
        zoom = cue.zoom;
        panX = cue.panX;
        panY = cue.panY;
      }
      break;
    }

    zoom = cue.zoom;
    panX = cue.panX;
    panY = cue.panY;

    if (cue.autoReturn) {
      const holdEnd = moveEnd + Math.max(0, cue.holdMs ?? 0);
      const returnDur = Math.max(100, cue.returnDurationMs ?? 800);
      const returnEnd = holdEnd + returnDur;
      if (timeMs > holdEnd && timeMs <= returnEnd) {
        const rawReturnT = Math.min(
          1,
          Math.max(0, (timeMs - holdEnd) / returnDur),
        );
        const easeReturnT = applyEasing(
          rawReturnT,
          cue.easing ?? 'ease-in-out',
        );
        zoom = cue.zoom + (1 - cue.zoom) * easeReturnT;
        panX = cue.panX + (0 - cue.panX) * easeReturnT;
        panY = cue.panY + (0 - cue.panY) * easeReturnT;
      } else if (timeMs > returnEnd) {
        zoom = 1;
        panX = 0;
        panY = 0;
      }
    }
  }

  return { tilt, yaw, zoom, panX, panY, isLocked: true };
}

export function isDirectorCameraMoving(
  track: DirectorCameraTrack,
  timeMs: number,
  options?: ResolveSyntheticDirectorCameraOptions,
): boolean {
  if (!hasActiveDirectorCameraTrack(track)) return false;
  const current = resolveSyntheticDirectorCamera(track, timeMs, options);
  const next = resolveSyntheticDirectorCamera(track, timeMs + 16, options);
  const prev = resolveSyntheticDirectorCamera(
    track,
    Math.max(0, timeMs - 16),
    options,
  );
  return hasCameraDelta(current, next) || hasCameraDelta(prev, current);
}
