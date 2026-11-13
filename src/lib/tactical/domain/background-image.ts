import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import {
  DEFAULT_442_AWAY,
  DEFAULT_442_HOME,
  DEFAULT_4231_HOME,
} from '@/lib/types/tactical/formations';
import {
  type AspectRatio,
  isVerticalAspectRatio,
  transformCoord,
} from '@/lib/types/tactical/primitives';
import { DEFAULT_BOUNDARY_BOX_SCREENSHOT } from '@/lib/types/tactical/slide';
import { toBenchPlayer } from './invariants';

function isPlayerInInitialPosition(
  p: DomainPlayer,
  aspectRatio: AspectRatio,
): boolean {
  if (
    p.area !== 'pitch' ||
    p.focus ||
    p.visionCone ||
    p.badges.length > 0 ||
    p.connectLines.length > 0 ||
    p.style.markerType !== 'circle'
  ) {
    return false;
  }
  const isVertical = isVerticalAspectRatio(aspectRatio);

  const defInitial =
    p.team === 'home'
      ? DEFAULT_4231_HOME.find((def) => def.shirtNo === p.shirtNo)
      : DEFAULT_442_AWAY.find((def) => def.shirtNo === p.shirtNo);
  if (defInitial) {
    const raw = { x: defInitial.x, y: defInitial.y };
    const pos = isVertical ? transformCoord(raw, '16:9', aspectRatio) : raw;
    if (Math.abs(p.x - pos.x) < 0.01 && Math.abs(p.y - pos.y) < 0.01) {
      return true;
    }
  }

  const def442 = DEFAULT_442_HOME.find((def) => def.shirtNo === p.shirtNo);
  if (def442) {
    const raw =
      p.team === 'home'
        ? { x: def442.x, y: def442.y }
        : { x: 100 - def442.x, y: def442.y };
    const pos = isVertical ? transformCoord(raw, '16:9', aspectRatio) : raw;
    if (Math.abs(p.x - pos.x) < 0.01 && Math.abs(p.y - pos.y) < 0.01) {
      return true;
    }
  }

  return false;
}

/**
 * スライドが未編集の初期状態（空、または初期フォーメーション22名のみ）かを判定する。
 */
export function isDefaultInitialSlide(
  slide: DomainSlide | undefined,
  phase: Pick<
    DomainTacticalPhase,
    'backgroundType' | 'backgroundImageUrl' | 'aspectRatio'
  >,
): boolean {
  if (!slide) return false;
  if (
    phase.backgroundType !== 'pitch' ||
    phase.backgroundImageUrl ||
    slide.arrows.length > 0 ||
    slide.zones.length > 0 ||
    slide.texts.length > 0 ||
    slide.ball.x !== 50 ||
    slide.ball.y !== 50 ||
    !slide.ball.visible
  ) {
    return false;
  }
  if (slide.players.length === 0) return true;
  if (slide.players.length !== 22) return false;
  return slide.players.every((p) =>
    isPlayerInInitialPosition(p, phase.aspectRatio),
  );
}

/**
 * フェーズに背景画像を適用する純粋関数。
 * 対象スライドが未編集ならその場で選手をベンチへ下げ、編集中なら新規スライドを挿入する。
 */
export function applyImageBackgroundToPhase(
  phase: DomainTacticalPhase,
  url: string,
  targetSlideId: string,
  createSlideId: () => string,
): {
  readonly phase: DomainTacticalPhase;
  readonly activeSlideId: string;
} {
  const currentSlide =
    phase.slides.find((s) => s.id === targetSlideId) ?? phase.slides[0];
  const screenshotBox = { ...DEFAULT_BOUNDARY_BOX_SCREENSHOT };

  if (!currentSlide) {
    return { phase, activeSlideId: targetSlideId };
  }

  const isEdited = !isDefaultInitialSlide(currentSlide, phase);

  if (isEdited) {
    const newSlideId = createSlideId();
    const slideCount = phase.slides.length;
    const newSlide: DomainSlide = {
      id: newSlideId,
      index: slideCount,
      label: `Scene ${slideCount + 1}`,
      players: currentSlide.players.map((p) => toBenchPlayer(p)),
      arrows: [],
      zones: [],
      texts: [],
      ball: {
        x: clampToScreenNorm(50),
        y: clampToScreenNorm(50),
        visible: false,
      },
      transitionDurationMs: 1000,
      pauseMs: 500,
      easing: 'ease-in-out',
    };

    const currentIdx = phase.slides.findIndex((s) => s.id === currentSlide.id);
    const nextSlides = [...phase.slides];
    if (currentIdx !== -1) {
      nextSlides.splice(currentIdx + 1, 0, newSlide);
    } else {
      nextSlides.push(newSlide);
    }

    return {
      phase: {
        ...phase,
        backgroundType: 'image',
        backgroundImageUrl: url,
        boundaryBox: screenshotBox,
        slides: nextSlides.map((s, idx) => ({ ...s, index: idx })),
      },
      activeSlideId: newSlideId,
    };
  }

  return {
    phase: {
      ...phase,
      backgroundType: 'image',
      backgroundImageUrl: url,
      boundaryBox: screenshotBox,
      slides: phase.slides.map((s) =>
        s.id !== currentSlide.id
          ? s
          : {
              ...s,
              ball: { ...s.ball, visible: false, trajectory: undefined },
              players: s.players.map((p) => toBenchPlayer(p)),
              arrows: s.arrows.filter(
                (a) => !a.sourcePlayerId && !a.targetPlayerId,
              ),
            },
      ),
    },
    activeSlideId: currentSlide.id,
  };
}

/** フェーズの背景を標準ピッチへ戻す純粋関数。 */
export function restoreDefaultPitchInPhase(
  phase: DomainTacticalPhase,
): DomainTacticalPhase {
  return {
    ...phase,
    backgroundType: 'pitch',
    backgroundImageUrl: undefined,
  };
}
