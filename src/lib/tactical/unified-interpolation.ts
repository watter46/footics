// Unified Tactical Canvas — Animation Interpolation & Zone Vertex Morphing Engine
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { DirectorCameraTrack, Slide } from '@/lib/types/tactical-unified';
import { applyEasing } from './easing';
import {
  type InterpolatedArrowState,
  type InterpolatedTextState,
  type InterpolatedZoneState,
  interpolateArrow,
  interpolateText,
  interpolateZone,
} from './interpolation-annotation';
import {
  BALL_ROTATION_FACTOR,
  calculateAccumulatedBallRotation,
  type InterpolatedBallState,
  interpolateBall,
} from './interpolation-ball';
import {
  hasActiveDirectorCameraTrack,
  type InterpolatedPitchTransformState,
  interpolatePitchTransform,
  type ResolveSyntheticDirectorCameraOptions,
  resolveCameraAtTime,
  resolveEffectiveSlideSegments,
  resolveSyntheticDirectorCamera,
  type SlideTimingLike,
} from './interpolation-camera';
import {
  type InterpolatedPlayerState,
  interpolatePlayer,
  matchSlidePlayers,
} from './interpolation-player';

export * from './interpolation-annotation';
export * from './interpolation-ball';
export * from './interpolation-camera';
export * from './interpolation-director';
// Re-export submodules to preserve public API without breaking changes
export * from './interpolation-geometry';
export * from './interpolation-player';

export interface InterpolatedUnifiedFrame {
  players: Record<string, InterpolatedPlayerState>;
  ball: InterpolatedBallState;
  zones: Record<string, InterpolatedZoneState>;
  arrows: Record<string, InterpolatedArrowState>;
  texts: Record<string, InterpolatedTextState>;
  pitchTransform: InterpolatedPitchTransformState;
  currentSlideIndex: number;
  nextSlideIndex: number;
  progress: number;
  isPaused: boolean;
}

/** 全スライドの総再生時間 (ms) を計算 */
export function calculateUnifiedTotalDuration(
  slides: readonly (Slide | DomainSlide | SlideTimingLike)[],
): number {
  if (slides.length <= 1) return 0;
  return resolveEffectiveSlideSegments(slides).reduce(
    (sum, seg) => sum + seg.effectiveDurationMs,
    0,
  );
}

/** 単一スライドを含む総再生時間 (ms) を解決 */
export function resolvePlaybackDurationMs(
  slides: readonly (Slide | DomainSlide | SlideTimingLike)[],
): number {
  if (!slides || slides.length === 0) return 0;
  if (slides.length === 1) {
    const s = slides[0] as (Slide | DomainSlide | SlideTimingLike) & {
      duration?: number;
      pauseDuration?: number;
    };
    const dur =
      s.duration ??
      (s.transitionDurationMs !== undefined
        ? s.transitionDurationMs / 1000
        : 2);
    const pause =
      s.pauseDuration ?? (s.pauseMs !== undefined ? s.pauseMs / 1000 : 1);
    return Math.max(1000, (dur + pause) * 1000);
  }
  return calculateUnifiedTotalDuration(slides);
}

const EMPTY_FRAME: InterpolatedUnifiedFrame = {
  players: {},
  ball: { x: 50, y: 50, visible: true, opacity: 1, rotation: 0 },
  zones: {},
  arrows: {},
  texts: {},
  pitchTransform: {
    panX: 0,
    panY: 0,
    zoom: 1,
    tilt: 0,
    yaw: 90,
    isLocked: false,
  },
  currentSlideIndex: 0,
  nextSlideIndex: 0,
  progress: 0,
  isPaused: false,
};

function syncArrowsWithPlayers(
  arrows: Record<string, InterpolatedArrowState>,
  players: Record<string, InterpolatedPlayerState>,
): Record<string, InterpolatedArrowState> {
  const synced: Record<string, InterpolatedArrowState> = {};
  for (const [id, arrow] of Object.entries(arrows)) {
    const sp = arrow.sourcePlayerId ? players[arrow.sourcePlayerId] : undefined;
    const tp = arrow.targetPlayerId ? players[arrow.targetPlayerId] : undefined;
    if (!sp && !tp) {
      synced[id] = arrow;
      continue;
    }
    const nextPoints = [...arrow.points];
    if (sp && nextPoints[0]) nextPoints[0] = { x: sp.x, y: sp.y };
    if (tp && nextPoints.length > 1) nextPoints[1] = { x: tp.x, y: tp.y };
    synced[id] = { ...arrow, points: nextPoints };
  }
  return synced;
}

function interpolateEntityMap<T extends { id: string }, R>(
  listA: T[],
  listB: T[],
  interp: (a?: T, b?: T) => R | null,
): Record<string, R> {
  const mapA = new Map(listA.map((item) => [item.id, item]));
  const mapB = new Map(listB.map((item) => [item.id, item]));
  const result: Record<string, R> = {};
  for (const id of new Set([...mapA.keys(), ...mapB.keys()])) {
    const res = interp(mapA.get(id), mapB.get(id));
    if (res) result[id] = res;
  }
  return result;
}

/** 指定時間 (timeMs) における全オブジェクトの補間フレーム状態を計算 */
export function getInterpolatedUnifiedSlideFrame(
  slides: Slide[],
  timeMs: number,
  directorCamera?: DirectorCameraTrack | null,
  directorCameraOptions?: ResolveSyntheticDirectorCameraOptions,
): InterpolatedUnifiedFrame {
  if (slides.length === 0) return EMPTY_FRAME;

  if (slides.length === 1) {
    const slide = slides[0];
    const players = Object.fromEntries(
      slide.players.map((p) => [p.id, interpolatePlayer(p, p, 0)!]),
    );
    const zones = Object.fromEntries(
      slide.zones.map((z) => [z.id, interpolateZone(z, z, 0)!]),
    );
    const rawArrows = Object.fromEntries(
      slide.arrows.map((a) => [a.id, interpolateArrow(a, a, 0)!]),
    );
    const arrows = syncArrowsWithPlayers(rawArrows, players);
    const texts = Object.fromEntries(
      slide.texts.map((t) => [t.id, interpolateText(t, t, 0)!]),
    );

    const pitchTransform = hasActiveDirectorCameraTrack(directorCamera)
      ? resolveSyntheticDirectorCamera(
          directorCamera,
          timeMs,
          directorCameraOptions,
        )
      : interpolatePitchTransform(
          slide.pitchTransform,
          slide.pitchTransform,
          0,
        );
    return {
      players,
      ball: {
        x: slide.ball?.x ?? 50,
        y: slide.ball?.y ?? 50,
        visible: slide.ball?.visible ?? true,
        opacity: 1,
        rotation: 0,
      },
      zones,
      arrows,
      texts,
      pitchTransform,
      currentSlideIndex: 0,
      nextSlideIndex: 0,
      progress: 0,
      isPaused: false,
    };
  }

  // スライド区間の特定
  const segments = resolveEffectiveSlideSegments(slides);
  let currentSlideIdx = 0;
  let nextSlideIdx = 1;
  let elapsedInSegment = 0;
  let activeSegment = segments[0];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const isLastSegment = i === segments.length - 1;
    if (timeMs < seg.startTimeMs + seg.effectiveDurationMs || isLastSegment) {
      currentSlideIdx = seg.slideIndex - 1;
      nextSlideIdx = seg.slideIndex;
      elapsedInSegment = Math.max(0, timeMs - seg.startTimeMs);
      activeSegment = seg;
      break;
    }
  }

  const slideA = slides[currentSlideIdx];
  const slideB = slides[nextSlideIdx];
  const segmentSlide = slideB ?? slides[0];
  const transitionDuration = Math.max(100, activeSegment.playerMoveMs);

  let rawT = elapsedInSegment / transitionDuration;
  const isPlayerPaused = rawT >= 1;
  if (rawT > 1) rawT = 1;

  const ease = applyEasing(rawT, segmentSlide.easing ?? 'ease-in-out');

  // カメラ補間（Slow / Continuous / Cut / Sync / Director）
  const { pitchTransform, isCameraMoving } = resolveCameraAtTime(
    slides,
    segments,
    activeSegment,
    timeMs,
    elapsedInSegment,
    directorCamera,
    directorCameraOptions,
  );

  // 1. Players 補間 (ID / 背番号 / 名前マッチングによるスムーズモーフィング)
  const players: Record<string, InterpolatedPlayerState> = {};
  const matchedPairs = matchSlidePlayers(slideA.players, slideB.players);
  matchedPairs.forEach(({ key, playerA, playerB }) => {
    const interpolated = interpolatePlayer(playerA, playerB, ease);
    if (interpolated) players[key] = interpolated;
  });

  // 2. Ball 補間
  const accumulatedRotation = calculateAccumulatedBallRotation(
    slides,
    currentSlideIdx,
  );
  const ball = interpolateBall(
    slideA.ball,
    slideB.ball,
    ease,
    accumulatedRotation,
  );

  // 3. Zones 補間 (Vertex Morphing)
  const zones = interpolateEntityMap(slideA.zones, slideB.zones, (a, b) =>
    interpolateZone(a, b, ease),
  );

  // 4. Arrows 補間
  const rawArrows = interpolateEntityMap(slideA.arrows, slideB.arrows, (a, b) =>
    interpolateArrow(a, b, ease),
  );
  const arrows = syncArrowsWithPlayers(rawArrows, players);

  // 5. Texts 補間
  const texts = interpolateEntityMap(slideA.texts, slideB.texts, (a, b) =>
    interpolateText(a, b, ease),
  );

  const totalDurationMs = calculateUnifiedTotalDuration(slides);
  const isPastTotal = totalDurationMs > 0 && timeMs >= totalDurationMs;
  const isPaused = (isPlayerPaused && !isCameraMoving) || isPastTotal;
  const resolvedCurrentSlideIndex = isPastTotal
    ? slides.length - 1
    : isPaused
      ? nextSlideIdx
      : currentSlideIdx;
  const resolvedNextSlideIndex = isPastTotal ? slides.length - 1 : nextSlideIdx;

  return {
    players,
    ball,
    zones,
    arrows,
    texts,
    pitchTransform,
    currentSlideIndex: resolvedCurrentSlideIndex,
    nextSlideIndex: resolvedNextSlideIndex,
    progress: rawT,
    isPaused,
  };
}
