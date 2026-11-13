import {
  type FormationType,
  getFormationActualPos,
} from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import {
  DEFAULT_442_AWAY,
  DEFAULT_4231_HOME,
} from '@/lib/types/tactical/formations';
import {
  type AspectRatio,
  isVerticalAspectRatio,
  transformCoord,
} from '@/lib/types/tactical/primitives';

function resolveTeamKickoffPositions(
  players: readonly DomainPlayer[],
  team: 'home' | 'away',
  aspectRatio: AspectRatio,
  formation: FormationType | undefined,
  outMap: Map<string, { x: number; y: number }>,
): void {
  const isVertical = isVerticalAspectRatio(aspectRatio);
  if (formation && FORMATION_POSITIONS[formation]) {
    const positions = FORMATION_POSITIONS[formation];
    const gkBasePos = { x: team === 'home' ? 7 : 93, y: 50 };
    players.forEach((p, idx) => {
      const posDef = positions[idx % positions.length];
      const base =
        posDef.position === 'GK'
          ? gkBasePos
          : getFormationActualPos(posDef, team, 'full');
      const targetPos = isVertical
        ? transformCoord(base, '16:9', aspectRatio)
        : base;
      outMap.set(p.id, {
        x: Math.max(3, Math.min(97, targetPos.x)),
        y: Math.max(3, Math.min(97, targetPos.y)),
      });
    });
    return;
  }

  const fallback = team === 'home' ? DEFAULT_4231_HOME : DEFAULT_442_AWAY;
  players.forEach((p, idx) => {
    const preset = fallback[idx % fallback.length];
    const rawPos = { x: preset.x, y: preset.y };
    const pos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    outMap.set(p.id, pos);
  });
}

export function resetSlideObjectsData(slide: DomainSlide): DomainSlide {
  return {
    ...slide,
    arrows: slide.arrows.filter((a) => a.locked),
    zones: slide.zones.filter((z) => z.locked),
    texts: slide.texts.filter((t) => t.locked),
    players: slide.players
      .filter((p) => p.locked || p.style.markerType !== 'ring')
      .map((p) => {
        if (p.locked || p.area === 'bench') return p;
        return {
          ...p,
          visionCone: undefined,
          connectLines: [],
          badges: [],
          focus: undefined,
          trajectory: undefined,
        };
      }),
    ball: slide.ball.locked
      ? { ...slide.ball }
      : { ...slide.ball, trajectory: undefined },
  };
}

export function resetSlideKeepSquadPositions(
  slide: DomainSlide,
  aspectRatio: AspectRatio,
  matchFormations?: {
    readonly home: FormationType;
    readonly away: FormationType;
  },
): DomainSlide {
  const newPositions = new Map<string, { x: number; y: number }>();
  const homePitch = slide.players.filter(
    (p) => p.team === 'home' && p.area === 'pitch',
  );
  const awayPitch = slide.players.filter(
    (p) => p.team === 'away' && p.area === 'pitch',
  );

  resolveTeamKickoffPositions(
    homePitch,
    'home',
    aspectRatio,
    matchFormations?.home,
    newPositions,
  );
  resolveTeamKickoffPositions(
    awayPitch,
    'away',
    aspectRatio,
    matchFormations?.away,
    newPositions,
  );

  const isSwapped = Boolean(slide.isSidesSwapped);
  const updatedPlayers: DomainPlayer[] = slide.players.map((p) => {
    if (p.area === 'bench') return { ...p };
    const rawPos = newPositions.get(p.id);
    const pos = rawPos
      ? isSwapped
        ? { x: 100 - rawPos.x, y: 100 - rawPos.y }
        : rawPos
      : undefined;
    return {
      ...p,
      ...(pos
        ? { x: clampToScreenNorm(pos.x), y: clampToScreenNorm(pos.y) }
        : {}),
      visionCone: undefined,
      focus: undefined,
      badges: [],
      connectLines: [],
      trajectory: undefined,
    };
  });

  return {
    ...slide,
    players: updatedPlayers,
    ball: {
      ...slide.ball,
      x: clampToScreenNorm(50),
      y: clampToScreenNorm(50),
      visible: true,
      trajectory: undefined,
    },
    arrows: [],
    zones: [],
    texts: [],
  };
}
