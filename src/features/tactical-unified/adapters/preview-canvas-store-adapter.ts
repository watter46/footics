/**
 * preview-canvas-store-adapter.ts
 *
 * スプリットプレビュー（3D Camera Preview / Timeline Playback）専用の CanvasStore アダプター。
 * 編集画面と同じ Konva コンポーネントツリー（CanvasDisplayStage）へ補間・3D投影済み状態を供給する。
 */

import {
  type AnnotationsData,
  type CanvasActions,
  type CanvasState,
  type CanvasStore,
  type CanvasStoreApi,
  hasActiveCameraTransform,
  projectSceneForCamera,
} from '@/features/tactical-unified/core';
import {
  DEFAULT_BOUNDARY_BOX,
  DEFAULT_PITCH_TRANSFORM,
} from '@/features/tactical-unified/core/store/canvas-store-pitch';
import {
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import type { useTacticalUnifiedStoreApi } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import type {
  InterpolatedPlayerState,
  InterpolatedTextState,
  InterpolatedZoneState,
} from '@/lib/tactical/unified-interpolation';
import { getInterpolatedUnifiedSlideFrame } from '@/lib/tactical/unified-interpolation';
import {
  type ArrowAnnotation,
  DEFAULT_PITCH_APPEARANCE,
  type PitchTransform,
  type Player,
  type TextAnnotation,
  type ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import {
  DEFAULT_BALL,
  DEFAULT_CAPABILITIES,
  DEFAULT_HISTORY,
} from './adapter-cache-helpers';

export type PreviewUnifiedStoreApi = ReturnType<
  typeof useTacticalUnifiedStoreApi
>;

type BallAnnotation = NonNullable<CanvasState['ball']>;

export interface PreviewCanvasStoreApi extends CanvasStoreApi {
  setPlaybackTime: (timeMs: number | null) => void;
  getPlaybackTime: () => number | null;
}

const noop = () => {};
const PREVIEW_ACTIONS: CanvasActions = new Proxy({} as CanvasActions, {
  get: (_target, prop) =>
    prop === 'canUndo' || prop === 'canRedo' ? () => false : noop,
});

const toPlayer = (p: InterpolatedPlayerState): Player => ({ ...p });
const toZone = (z: InterpolatedZoneState): ZoneAnnotation => ({
  ...z,
  annotationType: 'zone',
});
const toText = (t: InterpolatedTextState): TextAnnotation => ({
  ...t,
  annotationType: 'text',
});

export function createPreviewCanvasStoreAdapter(
  unifiedStore: PreviewUnifiedStoreApi,
): PreviewCanvasStoreApi {
  let playbackTimeMs: number | null = null;
  const listeners = new Set<
    (state: CanvasStore, prevState: CanvasStore) => void
  >();

  function buildState(): CanvasStore {
    const s = unifiedStore.getState();
    const activeSlide = selectActiveSlide(s);
    const slides = selectActivePhaseSlides(s);
    const projectAspectRatio = s.project.aspectRatio ?? '4:5';
    const aspectRatio = activeSlide?.aspectRatio ?? projectAspectRatio;
    const pitchAppearance =
      activeSlide?.pitchAppearance ??
      s.project.pitchAppearance ??
      DEFAULT_PITCH_APPEARANCE;
    const boundaryBox = activeSlide?.boundaryBox ?? DEFAULT_BOUNDARY_BOX;

    let rawAnnotations: AnnotationsData;
    let rawBall: BallAnnotation | null;
    let effectivePitchTransform: PitchTransform | null = null;

    if (playbackTimeMs !== null) {
      const frame = getInterpolatedUnifiedSlideFrame(slides, playbackTimeMs);
      const currentSlide = slides[frame.currentSlideIndex];
      const rawArrows: ArrowAnnotation[] = Object.values(frame.arrows).map(
        (arrow) => {
          const cur = currentSlide?.arrows.find((ca) => ca.id === arrow.id);
          return {
            ...arrow,
            annotationType: 'arrow',
            dashArray: arrow.dashArray ?? [],
            sourcePlayerId: cur?.sourcePlayerId ?? arrow.sourcePlayerId,
            targetPlayerId: cur?.targetPlayerId ?? arrow.targetPlayerId,
            arrowHead: cur?.arrowHead ?? arrow.arrowHead ?? true,
          };
        },
      );
      rawAnnotations = {
        markers: Object.values(frame.players).map(toPlayer),
        arrows: rawArrows,
        zones: Object.values(frame.zones).map(toZone),
        texts: Object.values(frame.texts).map(toText),
      };
      rawBall = frame.ball
        ? {
            x: frame.ball.x,
            y: frame.ball.y,
            visible: frame.ball.visible,
          }
        : null;
      effectivePitchTransform = frame.pitchTransform;
    } else {
      rawAnnotations = {
        markers: activeSlide?.players ?? [],
        arrows: activeSlide?.arrows ?? [],
        zones: activeSlide?.zones ?? [],
        texts: activeSlide?.texts ?? [],
      };
      rawBall = activeSlide?.ball
        ? {
            x: activeSlide.ball.x,
            y: activeSlide.ball.y,
            visible: activeSlide.ball.visible,
          }
        : (DEFAULT_BALL ?? null);
      effectivePitchTransform = activeSlide?.pitchTransform ?? null;
    }

    let annotations = rawAnnotations;
    let ball = rawBall;
    let cameraTransform: PitchTransform | null = null;

    if (hasActiveCameraTransform(effectivePitchTransform)) {
      const projected = projectSceneForCamera({
        annotations: rawAnnotations,
        ball: rawBall,
        pitchTransform: effectivePitchTransform,
        aspectRatio,
      });
      annotations = projected.annotations;
      ball = projected.ball;
      cameraTransform = effectivePitchTransform;
    }

    return {
      config: {
        mode: 'tactical-board',
        markerMode: s.markerMode,
        aspectRatio,
        backgroundImageUrl: activeSlide?.backgroundImageUrl,
        defaultBoundaryBox: boundaryBox,
        pitchAppearance,
      },
      capabilities: DEFAULT_CAPABILITIES,
      ball,
      teamVisibility: s.teamVisibility,
      activeTool: 'select',
      continuousDrawing: false,
      selectedObjects: [],
      selectedIds: [],
      pitchTransform: { ...DEFAULT_PITCH_TRANSFORM, isLocked: false },
      cameraTransform,
      boundaryBox,
      aspectRatio,
      pitchAppearance,
      annotations,
      clipboard: null,
      drawingPreview: null,
      isDragging: false,
      isHudOpen: false,
      color: '#ffffff',
      strokeWidth: 3,
      fontSize: 16,
      customColor: '#ffffff',
      markerMode: s.markerMode,
      connectingPlayerId: null,
      prevSlide: null,
      activeSlideId: activeSlide?.id,
      history: DEFAULT_HISTORY,
      ...PREVIEW_ACTIONS,
    };
  }

  let currentState: CanvasStore = buildState();
  const initialState: CanvasStore = currentState;

  function updateAndNotify() {
    const prevState = currentState;
    currentState = buildState();
    for (const listener of listeners) listener(currentState, prevState);
  }

  let prevActiveSlide = selectActiveSlide(unifiedStore.getState());
  let prevSlides = selectActivePhaseSlides(unifiedStore.getState());
  let prevAspectRatio = unifiedStore.getState().project.aspectRatio;
  let prevAppearance = unifiedStore.getState().project.pitchAppearance;
  let prevMarkerMode = unifiedStore.getState().markerMode;
  let prevTeamVisibility = unifiedStore.getState().teamVisibility;

  unifiedStore.subscribe(() => {
    const s = unifiedStore.getState();
    const activeSlide = selectActiveSlide(s);
    const slides = selectActivePhaseSlides(s);
    const projectAspectRatio = s.project.aspectRatio;
    const projectPitchAppearance = s.project.pitchAppearance;
    const markerMode = s.markerMode;
    const teamVisibility = s.teamVisibility;

    if (playbackTimeMs === null) {
      if (
        prevActiveSlide === activeSlide &&
        prevSlides === slides &&
        prevAspectRatio === projectAspectRatio &&
        prevAppearance === projectPitchAppearance &&
        prevMarkerMode === markerMode &&
        prevTeamVisibility === teamVisibility
      ) {
        return;
      }
    }

    prevActiveSlide = activeSlide;
    prevSlides = slides;
    prevAspectRatio = projectAspectRatio;
    prevAppearance = projectPitchAppearance;
    prevMarkerMode = markerMode;
    prevTeamVisibility = teamVisibility;

    updateAndNotify();
  });

  return {
    getState: () => currentState,
    getInitialState: () => initialState,
    setState: noop,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setPlaybackTime: (timeMs) => {
      playbackTimeMs = timeMs;
      updateAndNotify();
    },
    getPlaybackTime: () => playbackTimeMs,
  };
}
