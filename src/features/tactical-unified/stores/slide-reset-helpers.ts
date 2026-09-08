import {
  type AspectRatio,
  type BoundaryBox,
  DEFAULT_442_HOME,
  isVerticalAspectRatio,
  type PitchTransform,
  type Slide,
  transformCoord,
} from '@/lib/types/tactical-unified';
import type { SelectedObject } from './tool-slice';

function getResetPlayerCoord(
  team: 'home' | 'away' | 'neutral',
  index: number,
  isVertical: boolean,
  aspectRatio: AspectRatio,
): { x: number; y: number } | undefined {
  if (team !== 'home' && team !== 'away') return undefined;
  const defaultPos = DEFAULT_442_HOME[index];
  if (!defaultPos) return undefined;
  const rawPos =
    team === 'home'
      ? { x: defaultPos.x, y: defaultPos.y }
      : { x: 100 - defaultPos.x, y: defaultPos.y };
  return isVertical ? transformCoord(rawPos, '16:9', aspectRatio) : rawPos;
}

export function resetSlideTacticsData(
  slide: Slide,
  defaultBox: BoundaryBox,
  aspectRatio: AspectRatio = '16:9',
): Slide {
  const isVertical = isVerticalAspectRatio(aspectRatio);

  let homePitchIndex = 0;
  let awayPitchIndex = 0;

  const resetPlayers = slide.players.map((p) => {
    const idx = p.team === 'home' ? homePitchIndex++ : awayPitchIndex++;
    const pos = getResetPlayerCoord(p.team, idx, isVertical, aspectRatio);

    return {
      ...p,
      x: pos?.x ?? p.x,
      y: pos?.y ?? p.y,
      area: pos ? ('pitch' as const) : p.area,
      visionCone: undefined,
      connectLines: [],
      badges: [],
      focus: undefined,
      trajectory: undefined,
    };
  });

  const resetTransform: PitchTransform = {
    panX: 0,
    panY: 0,
    zoom: 1,
    tilt: 0,
    isLocked: true,
  };

  return {
    ...slide,
    arrows: [],
    zones: [],
    texts: [],
    players: resetPlayers,
    ball: { x: 50, y: 50, visible: true },
    boundaryBox: { ...defaultBox },
    pitchPosition: undefined,
    pitchTransform: resetTransform,
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
