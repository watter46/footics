import { calculateBezierPoint } from '@/lib/tactical/trajectory';
import { interpolatePitchTransform } from '@/lib/tactical/unified-interpolation';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  DomainBallState,
  DomainPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import {
  interpolateArrows,
  interpolateTexts,
  interpolateZones,
} from './slide-entity-interpolators';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolatePlayers(
  playersA: readonly DomainPlayer[],
  playersB: readonly DomainPlayer[],
  ease: number,
): {
  interpolatedPlayers: DomainPlayer[];
  playerOpacityMap: Record<string, { opacity: number; visible: boolean }>;
} {
  const mapA = new Map(playersA.map((p) => [p.id, p]));
  const mapB = new Map(playersB.map((p) => [p.id, p]));
  const allIds = new Set([...mapA.keys(), ...mapB.keys()]);

  const interpolatedPlayers: DomainPlayer[] = [];
  const playerOpacityMap: Record<
    string,
    { opacity: number; visible: boolean }
  > = {};

  for (const id of allIds) {
    const pA = mapA.get(id);
    const pB = mapB.get(id);

    if (pA && pB) {
      let x = pB.x;
      let y = pB.y;

      if (pA.area === 'pitch' && pB.area === 'pitch') {
        if (pB.trajectory && pB.trajectory.type !== 'straight') {
          const pt = calculateBezierPoint(
            { x: pA.x, y: pA.y },
            { x: pB.x, y: pB.y },
            ease,
            pB.trajectory,
          );
          x = clampToScreenNorm(pt.x);
          y = clampToScreenNorm(pt.y);
        } else {
          x = clampToScreenNorm(lerp(pA.x, pB.x, ease));
          y = clampToScreenNorm(lerp(pA.y, pB.y, ease));
        }
      }

      const mergedPlayer: DomainPlayer = { ...pB, x, y };
      interpolatedPlayers.push(mergedPlayer);
      playerOpacityMap[id] = {
        opacity: 1,
        visible: mergedPlayer.area === 'pitch',
      };
    } else if (pA && !pB) {
      const opacity = Math.max(0, 1 - ease);
      interpolatedPlayers.push(pA);
      playerOpacityMap[id] = {
        opacity,
        visible: opacity > 0 && pA.area === 'pitch',
      };
    } else if (!pA && pB) {
      const opacity = Math.min(1, ease);
      interpolatedPlayers.push(pB);
      playerOpacityMap[id] = {
        opacity,
        visible: opacity > 0 && pB.area === 'pitch',
      };
    }
  }

  return { interpolatedPlayers, playerOpacityMap };
}

function interpolateBallState(
  ballA: DomainBallState,
  ballB: DomainBallState,
  ease: number,
): DomainBallState {
  let x = ballB.x;
  let y = ballB.y;

  if (ballB.trajectory && ballB.trajectory.type !== 'straight') {
    const pt = calculateBezierPoint(
      { x: ballA.x, y: ballA.y },
      { x: ballB.x, y: ballB.y },
      ease,
      ballB.trajectory,
    );
    x = clampToScreenNorm(pt.x);
    y = clampToScreenNorm(pt.y);
  } else {
    x = clampToScreenNorm(lerp(ballA.x, ballB.x, ease));
    y = clampToScreenNorm(lerp(ballA.y, ballB.y, ease));
  }

  const hasSizeScale =
    ballA.sizeScale !== undefined || ballB.sizeScale !== undefined;

  return {
    ...ballB,
    x,
    y,
    visible: ease < 0.5 ? ballA.visible : ballB.visible,
    color: ballB.color ?? ballA.color,
    sizeScale: hasSizeScale
      ? lerp(ballA.sizeScale ?? 1, ballB.sizeScale ?? 1, ease)
      : undefined,
  };
}

export function interpolateSlide(
  slideA: DomainSlide,
  slideB: DomainSlide,
  ease: number,
): {
  slide: DomainSlide;
  playerOpacityMap: Record<string, { opacity: number; visible: boolean }>;
  zoneOpacityMap: Record<string, { opacity: number; visible: boolean }>;
  arrowProgressMap: Record<
    string,
    { progress: number; dashOffset: number; opacity: number; visible: boolean }
  >;
} {
  const { interpolatedPlayers, playerOpacityMap } = interpolatePlayers(
    slideA.players,
    slideB.players,
    ease,
  );
  const ball = interpolateBallState(slideA.ball, slideB.ball, ease);
  const { interpolatedZones, zoneOpacityMap } = interpolateZones(
    slideA.zones,
    slideB.zones,
    ease,
  );
  const { interpolatedArrows, arrowProgressMap } = interpolateArrows(
    slideA.arrows,
    slideB.arrows,
    interpolatedPlayers,
    ease,
  );
  const texts = interpolateTexts(slideA.texts, slideB.texts, ease);

  const pitchTransform =
    slideA.pitchTransform && slideB.pitchTransform
      ? interpolatePitchTransform(
          slideA.pitchTransform,
          slideB.pitchTransform,
          ease,
        )
      : (slideB.pitchTransform ?? slideA.pitchTransform);

  const slide: DomainSlide = {
    ...slideB,
    id: slideA.id,
    index: slideA.index,
    players: interpolatedPlayers,
    ball,
    zones: interpolatedZones,
    arrows: interpolatedArrows,
    texts,
    pitchTransform,
  };

  return { slide, playerOpacityMap, zoneOpacityMap, arrowProgressMap };
}
