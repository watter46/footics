import type { FormationType } from '@/lib/data/formations';
import { getFormationActualPos } from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import {
  type AspectRatio,
  type BoundaryBox,
  DEFAULT_442_AWAY,
  DEFAULT_4231_HOME,
  getDefaultBoundaryBoxForAspect,
  isVerticalAspectRatio,
  type Slide,
  type TacticalProject,
  transformCoord,
} from '@/lib/types/tactical-unified';
import type { SelectedObject } from './tool-slice';

export function fitProjectPlayers(
  project: TacticalProject,
  _stageAspect?: number | null,
): TacticalProject {
  return project;
}

export function resetSlideKeepSquadData(
  slide: Slide,
  aspectRatio: AspectRatio,
  matchFormations?: { home: FormationType; away: FormationType },
): Slide {
  const isVertical = isVerticalAspectRatio(aspectRatio);

  const homePitchPlayers = slide.players.filter(
    (p) => p.team === 'home' && p.area !== 'bench',
  );
  const awayPitchPlayers = slide.players.filter(
    (p) => p.team === 'away' && p.area !== 'bench',
  );

  const newPositions = new Map<string, { x: number; y: number }>();

  if (matchFormations?.home && FORMATION_POSITIONS[matchFormations.home]) {
    const positions = FORMATION_POSITIONS[matchFormations.home];
    homePitchPlayers.forEach((p, idx) => {
      const posDef = positions[idx % positions.length];
      const rawPos = getFormationActualPos(posDef, 'home', 'full');
      let targetPos = isVertical
        ? transformCoord(rawPos, '16:9', aspectRatio)
        : rawPos;
      if (posDef.position === 'GK') {
        const gkBasePos = { x: 7, y: 50 };
        targetPos = isVertical
          ? transformCoord(gkBasePos, '16:9', aspectRatio)
          : gkBasePos;
      }
      const clampedX = Math.max(3, Math.min(97, targetPos.x));
      const clampedY = Math.max(3, Math.min(97, targetPos.y));
      newPositions.set(p.id, { x: clampedX, y: clampedY });
    });
  } else {
    homePitchPlayers.forEach((p, idx) => {
      const preset = DEFAULT_4231_HOME[idx % DEFAULT_4231_HOME.length];
      const rawPos = { x: preset.x, y: preset.y };
      const pos = isVertical
        ? transformCoord(rawPos, '16:9', aspectRatio)
        : rawPos;
      newPositions.set(p.id, pos);
    });
  }

  if (matchFormations?.away && FORMATION_POSITIONS[matchFormations.away]) {
    const positions = FORMATION_POSITIONS[matchFormations.away];
    awayPitchPlayers.forEach((p, idx) => {
      const posDef = positions[idx % positions.length];
      const rawPos = getFormationActualPos(posDef, 'away', 'full');
      let targetPos = isVertical
        ? transformCoord(rawPos, '16:9', aspectRatio)
        : rawPos;
      if (posDef.position === 'GK') {
        const gkBasePos = { x: 93, y: 50 };
        targetPos = isVertical
          ? transformCoord(gkBasePos, '16:9', aspectRatio)
          : gkBasePos;
      }
      const clampedX = Math.max(3, Math.min(97, targetPos.x));
      const clampedY = Math.max(3, Math.min(97, targetPos.y));
      newPositions.set(p.id, { x: clampedX, y: clampedY });
    });
  } else {
    awayPitchPlayers.forEach((p, idx) => {
      const preset = DEFAULT_442_AWAY[idx % DEFAULT_442_AWAY.length];
      const rawPos = { x: preset.x, y: preset.y };
      const pos = isVertical
        ? transformCoord(rawPos, '16:9', aspectRatio)
        : rawPos;
      newPositions.set(p.id, pos);
    });
  }

  const isSwapped = Boolean(slide.isSidesSwapped);

  const updatedPlayers = slide.players.map((p) => {
    const rawPos = newPositions.get(p.id);
    const pos = rawPos
      ? isSwapped
        ? { x: 100 - rawPos.x, y: 100 - rawPos.y }
        : rawPos
      : undefined;
    return {
      ...p,
      ...(pos ? { x: pos.x, y: pos.y } : {}),
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
      x: 50,
      y: 50,
      visible: true,
      trajectory: undefined,
    },
    boundaryBox: getDefaultBoundaryBoxForAspect(aspectRatio),
    arrows: [],
    zones: [],
    texts: [],
  };
}

export function resetSlideObjectsData(
  slide: Slide,
  defaultBox: BoundaryBox,
): Slide {
  return {
    ...slide,
    arrows: slide.arrows.filter((a) => a.locked),
    zones: slide.zones.filter((z) => z.locked),
    texts: slide.texts.filter((t) => t.locked),
    players: slide.players
      .filter((p) => p.locked || p.style.markerType !== 'ring')
      .map((p) => {
        if (p.locked) return p;
        return {
          ...p,
          visionCone: undefined,
          connectLines: [],
          badges: [],
          focus: undefined,
          trajectory: undefined,
        };
      }),
    boundaryBox: slide.boundaryBox ?? { ...defaultBox },
  };
}

function isSelectedObjectLocked(obj: SelectedObject, slide: Slide): boolean {
  switch (obj.kind) {
    case 'player':
      return Boolean(slide.players.find((p) => p.id === obj.id)?.locked);
    case 'arrow':
      return Boolean(slide.arrows.find((a) => a.id === obj.id)?.locked);
    case 'zone':
      return Boolean(slide.zones.find((z) => z.id === obj.id)?.locked);
    case 'text':
      return Boolean(slide.texts.find((t) => t.id === obj.id)?.locked);
    default:
      return false;
  }
}

export function filterLockedSelectedObjects(
  selectedObjects: SelectedObject[],
  slide: Slide | undefined,
): SelectedObject[] {
  if (!slide) return [];
  return selectedObjects.filter((o) => isSelectedObjectLocked(o, slide));
}
