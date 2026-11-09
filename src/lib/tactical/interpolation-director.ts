/**
 * interpolation-director.ts
 * Synthetic multi-camera resolver for Director mode.
 * Combines global camera (tilt/yaw) and action camera (zoom/pan).
 */

import type { DirectorCameraTrack } from '@/lib/types/tactical-unified';
import { applyEasing } from './easing';
import {
  hasCameraDelta,
  type InterpolatedPitchTransformState,
} from './interpolation-camera';

/**
 * ディレクターカメラトラックが有効かつキーフレームが存在するか判定
 */
export function hasActiveDirectorCameraTrack(
  track?: DirectorCameraTrack | null,
): track is DirectorCameraTrack {
  if (!track || !track.enabled) return false;
  return (
    (track.globalKeyframes?.length ?? 0) > 0 ||
    (track.actionCues?.length ?? 0) > 0
  );
}

/**
 * ディレクターカメラ解決オプション
 */
export interface ResolveSyntheticDirectorCameraOptions {
  /** 停止・編集中フラグ（true の場合、アクティブ/選択Cueのターゲット値を100%即時反映） */
  isEditing?: boolean;
  selectedCueId?: string | null;
}

/**
 * ディレクターカメラトラック（全体カメラ＋アクションカメラ）を合成解決
 */
export function resolveSyntheticDirectorCamera(
  track: DirectorCameraTrack,
  timeMs: number,
  options?: number | ResolveSyntheticDirectorCameraOptions,
): InterpolatedPitchTransformState {
  const opts: ResolveSyntheticDirectorCameraOptions =
    typeof options === 'object' && options !== null ? options : {};
  const isEditing = opts.isEditing ?? false;
  const selectedCueId = opts.selectedCueId ?? null;

  // ① 全体カメラ (Tilt / Yaw)
  const sortedGlobal = [...(track.globalKeyframes ?? [])].sort(
    (a, b) => a.timeMs - b.timeMs,
  );
  let tilt = 0;
  let yaw = 90;

  if (sortedGlobal.length === 0) {
    tilt = 0;
    yaw = 90;
  } else if (sortedGlobal.length === 1 || timeMs <= sortedGlobal[0].timeMs) {
    tilt = sortedGlobal[0].tilt;
    yaw = ((sortedGlobal[0].yaw % 360) + 360) % 360;
  } else if (timeMs >= sortedGlobal[sortedGlobal.length - 1].timeMs) {
    const last = sortedGlobal[sortedGlobal.length - 1];
    tilt = last.tilt;
    yaw = ((last.yaw % 360) + 360) % 360;
  } else {
    for (let i = 0; i < sortedGlobal.length - 1; i++) {
      const kfA = sortedGlobal[i];
      const kfB = sortedGlobal[i + 1];
      if (timeMs >= kfA.timeMs && timeMs <= kfB.timeMs) {
        const span = Math.max(1, kfB.timeMs - kfA.timeMs);
        const rawT = Math.min(1, Math.max(0, (timeMs - kfA.timeMs) / span));
        const easeT = applyEasing(rawT, kfB.easing ?? 'ease-in-out');
        tilt = kfA.tilt + (kfB.tilt - kfA.tilt) * easeT;
        let deltaYaw = ((((kfB.yaw - kfA.yaw) % 360) + 540) % 360) - 180;
        if (deltaYaw === -180 && kfB.yaw > kfA.yaw) deltaYaw = 180;
        yaw = (((kfA.yaw + deltaYaw * easeT) % 360) + 360) % 360;
        break;
      }
    }
  }

  // ② アクションカメラ (Zoom / Pan)
  const sortedCues = [...(track.actionCues ?? [])].sort(
    (a, b) => a.startTimeMs - b.startTimeMs,
  );
  let zoom = 1;
  let panX = 0;
  let panY = 0;

  if (isEditing) {
    let editingCue: (typeof sortedCues)[number] | undefined;
    if (selectedCueId) {
      editingCue = sortedCues.find((c) => c.id === selectedCueId);
    }
    if (!editingCue) {
      editingCue = sortedCues.find(
        (c) =>
          timeMs >= c.startTimeMs &&
          timeMs <= c.startTimeMs + (c.durationMs ?? 1000),
      );
    }
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
    const fromZoom = zoom;
    const fromPanX = panX;
    const fromPanY = panY;
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
      const holdMs = Math.max(0, cue.holdMs ?? 0);
      const holdEnd = moveEnd + holdMs;
      const returnDur = Math.max(100, cue.returnDurationMs ?? 800);
      const returnEnd = holdEnd + returnDur;

      if (timeMs <= holdEnd) {
        // hold
      } else if (timeMs <= returnEnd) {
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
      } else {
        zoom = 1;
        panX = 0;
        panY = 0;
      }
    }
  }

  return {
    tilt,
    yaw,
    zoom,
    panX,
    panY,
    isLocked: true,
  };
}

/**
 * ディレクターカメラが指定時刻で移動中か判定
 */
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
