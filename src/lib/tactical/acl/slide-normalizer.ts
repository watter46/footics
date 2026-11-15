import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import {
  type BoundaryBox,
  getDefaultBoundaryBoxForAspect,
} from '@/lib/types/tactical/pitch-config';
import type { AspectRatio } from '@/lib/types/tactical/primitives';
import {
  normalizeArrows,
  normalizeBall,
  normalizeTexts,
  normalizeZones,
} from './annotation-normalizers';
import { normalizePlayers } from './player-normalizer';

const VALID_ASPECT_RATIOS: readonly AspectRatio[] = [
  '16:9',
  '9:16',
  '4:5',
  '1:1',
];

function isAspectRatio(val: unknown): val is AspectRatio {
  return (
    typeof val === 'string' && VALID_ASPECT_RATIOS.includes(val as AspectRatio)
  );
}

export function normalizeSlide(raw: unknown, index: number): DomainSlide {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;

  const id = typeof s.id === 'string' && s.id ? s.id : crypto.randomUUID();
  const slideIndex = typeof s.index === 'number' ? s.index : index;
  const label = typeof s.label === 'string' ? s.label : undefined;
  const players = normalizePlayers(s.players);
  const arrows = normalizeArrows(s.arrows);
  const zones = normalizeZones(s.zones);
  const texts = normalizeTexts(s.texts);
  const ball = normalizeBall(s.ball);

  const transitionDurationMs =
    typeof s.transitionDurationMs === 'number'
      ? Math.max(100, Math.min(30000, s.transitionDurationMs))
      : 1000;

  const pauseMs =
    typeof s.pauseMs === 'number'
      ? Math.max(0, Math.min(10000, s.pauseMs))
      : 500;

  const easing =
    typeof s.easing === 'string' &&
    ['linear', 'ease-in', 'ease-out', 'ease-in-out'].includes(s.easing)
      ? (s.easing as DomainSlide['easing'])
      : 'ease-in-out';

  const cameraTransitionMode =
    typeof s.cameraTransitionMode === 'string' &&
    ['sync', 'slow', 'continuous', 'cut'].includes(s.cameraTransitionMode)
      ? (s.cameraTransitionMode as DomainSlide['cameraTransitionMode'])
      : undefined;

  const cameraDurationMs =
    typeof s.cameraDurationMs === 'number' ? s.cameraDurationMs : undefined;

  const pitchTransform =
    s.pitchTransform && typeof s.pitchTransform === 'object'
      ? (s.pitchTransform as DomainSlide['pitchTransform'])
      : undefined;

  const isSidesSwapped =
    typeof s.isSidesSwapped === 'boolean' ? s.isSidesSwapped : undefined;

  return {
    id,
    index: slideIndex,
    label,
    players,
    arrows,
    zones,
    texts,
    ball,
    transitionDurationMs,
    pauseMs,
    easing,
    cameraTransitionMode,
    cameraDurationMs,
    pitchTransform,
    isSidesSwapped,
  };
}

function resolveBoundaryBox(
  candidateBox: unknown,
  aspectRatio: AspectRatio,
): BoundaryBox {
  const fallback = getDefaultBoundaryBoxForAspect(aspectRatio);
  if (!candidateBox || typeof candidateBox !== 'object') return fallback;
  const cb = candidateBox as Record<string, unknown>;
  return {
    x: typeof cb.x === 'number' ? cb.x : fallback.x,
    y: typeof cb.y === 'number' ? cb.y : fallback.y,
    width: typeof cb.width === 'number' ? cb.width : fallback.width,
    height: typeof cb.height === 'number' ? cb.height : fallback.height,
    enabled: typeof cb.enabled === 'boolean' ? cb.enabled : true,
    visible: typeof cb.visible === 'boolean' ? cb.visible : false,
    fitTarget:
      cb.fitTarget === 'pitch' ||
      cb.fitTarget === 'canvas' ||
      cb.fitTarget === 'custom'
        ? cb.fitTarget
        : fallback.fitTarget,
  };
}

export function normalizePhases(
  root: Record<string, unknown>,
): [DomainTacticalPhase, ...DomainTacticalPhase[]] {
  let rawPhases: unknown[] = [];
  if (Array.isArray(root.phases) && root.phases.length > 0) {
    rawPhases = root.phases;
  } else if (Array.isArray(root.slides) && root.slides.length > 0) {
    rawPhases = [
      { id: crypto.randomUUID(), name: 'Phase 1', slides: root.slides },
    ];
  } else {
    rawPhases = [{ id: crypto.randomUUID(), name: 'Phase 1', slides: [{}] }];
  }

  const phasesList: DomainTacticalPhase[] = rawPhases.map((rawP, pIdx) => {
    const p = (rawP && typeof rawP === 'object' ? rawP : {}) as Record<
      string,
      unknown
    >;
    const phaseId =
      typeof p.id === 'string' && p.id ? p.id : crypto.randomUUID();
    const phaseName =
      typeof p.name === 'string' && p.name ? p.name : `Phase ${pIdx + 1}`;
    const rawSlidesList: unknown[] =
      Array.isArray(p.slides) && p.slides.length > 0 ? p.slides : [{}];
    const firstSlide =
      rawSlidesList[0] && typeof rawSlidesList[0] === 'object'
        ? (rawSlidesList[0] as Record<string, unknown>)
        : {};

    let aspectRatio: AspectRatio = '4:5';
    if (isAspectRatio(p.aspectRatio)) {
      aspectRatio = p.aspectRatio;
    } else if (isAspectRatio(firstSlide.aspectRatio)) {
      aspectRatio = firstSlide.aspectRatio;
    } else if (isAspectRatio(root.aspectRatio)) {
      aspectRatio = root.aspectRatio;
    }

    const boundaryBox = resolveBoundaryBox(
      p.boundaryBox ?? firstSlide.boundaryBox ?? root.boundaryBox,
      aspectRatio,
    );

    let backgroundType: 'pitch' | 'image' | 'blank' = 'pitch';
    const candidateBg =
      p.backgroundType ?? firstSlide.backgroundType ?? root.backgroundType;
    if (
      candidateBg === 'pitch' ||
      candidateBg === 'image' ||
      candidateBg === 'blank'
    ) {
      backgroundType = candidateBg;
    }

    const backgroundImageUrl =
      typeof p.backgroundImageUrl === 'string'
        ? p.backgroundImageUrl
        : typeof firstSlide.backgroundImageUrl === 'string'
          ? firstSlide.backgroundImageUrl
          : typeof root.backgroundImageUrl === 'string'
            ? root.backgroundImageUrl
            : undefined;

    const directorCamera =
      p.directorCamera && typeof p.directorCamera === 'object'
        ? (p.directorCamera as DomainTacticalPhase['directorCamera'])
        : undefined;

    const slides: [DomainSlide, ...DomainSlide[]] = [
      normalizeSlide(rawSlidesList[0], 0),
      ...rawSlidesList.slice(1).map((s, idx) => normalizeSlide(s, idx + 1)),
    ];

    return {
      id: phaseId,
      name: phaseName,
      aspectRatio,
      boundaryBox,
      backgroundType,
      backgroundImageUrl,
      directorCamera,
      slides,
    };
  });

  const [firstPhase, ...restPhases] = phasesList;
  return [firstPhase, ...restPhases];
}
