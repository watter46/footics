import {
  getPitchRectNormalized,
  mapPlayersToPitchRect,
} from '@/lib/tactical/pitch-stage-mapping';
import {
  type AspectRatio,
  type BoundaryBox,
  DEFAULT_442_AWAY,
  DEFAULT_4231_HOME,
  DEFAULT_BOUNDARY_BOX_FULL,
  isVerticalAspectRatio,
  type Slide,
  type TacticalProject,
  transformCoord,
} from '@/lib/types/tactical-unified';
import type { SelectedObject } from './tool-slice';

export function fitProjectPlayers(
  project: TacticalProject,
  stageAspect: number | null,
): TacticalProject {
  const rect = getPitchRectNormalized(stageAspect, project.aspectRatio);
  return {
    ...project,
    slides: project.slides.map((sl) => ({
      ...sl,
      players: mapPlayersToPitchRect(sl.players, rect),
    })),
  };
}

export function resetSlideKeepSquadData(
  slide: Slide,
  aspectRatio: AspectRatio,
): Slide {
  const isVertical = isVerticalAspectRatio(aspectRatio);

  const homePitchPlayers = slide.players.filter(
    (p) => p.team === 'home' && p.area !== 'bench',
  );
  const awayPitchPlayers = slide.players.filter(
    (p) => p.team === 'away' && p.area !== 'bench',
  );

  const newPositions = new Map<string, { x: number; y: number }>();

  homePitchPlayers.forEach((p, idx) => {
    const preset = DEFAULT_4231_HOME[idx % DEFAULT_4231_HOME.length];
    const rawPos = { x: preset.x, y: preset.y };
    const pos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    newPositions.set(p.id, pos);
  });

  awayPitchPlayers.forEach((p, idx) => {
    const preset = DEFAULT_442_AWAY[idx % DEFAULT_442_AWAY.length];
    const rawPos = { x: preset.x, y: preset.y };
    const pos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    newPositions.set(p.id, pos);
  });

  const updatedPlayers = slide.players.map((p) => {
    const pos = newPositions.get(p.id);
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
    boundaryBox: {
      ...DEFAULT_BOUNDARY_BOX_FULL,
      visible: true,
    },
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
