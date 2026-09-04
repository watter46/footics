import type { SelectedObject } from '@/features/tactical-unified/stores/tactical-unified-store';
import type {
  ArrowAnnotation,
  BallState,
  Player,
  Slide,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';

export interface NormBBox {
  minNormX: number;
  maxNormX: number;
  minNormY: number;
  maxNormY: number;
}

function isInsideBBox(x: number, y: number, bbox: NormBBox): boolean {
  return (
    x >= bbox.minNormX &&
    x <= bbox.maxNormX &&
    y >= bbox.minNormY &&
    y <= bbox.maxNormY
  );
}

function findEnclosedPlayers(
  players: Player[],
  bbox: NormBBox,
): SelectedObject[] {
  const result: SelectedObject[] = [];
  for (const player of players) {
    if (player.area === 'pitch' && isInsideBBox(player.x, player.y, bbox)) {
      result.push({ id: player.id, kind: 'player' });
    }
  }
  return result;
}

function findEnclosedTexts(
  texts: TextAnnotation[],
  bbox: NormBBox,
): SelectedObject[] {
  const result: SelectedObject[] = [];
  for (const text of texts) {
    if (isInsideBBox(text.x, text.y, bbox)) {
      result.push({ id: text.id, kind: 'text' });
    }
  }
  return result;
}

function findEnclosedArrows(
  arrows: ArrowAnnotation[],
  bbox: NormBBox,
): SelectedObject[] {
  const result: SelectedObject[] = [];
  for (const arrow of arrows) {
    if (arrow.points.some((pt) => isInsideBBox(pt.x, pt.y, bbox))) {
      result.push({ id: arrow.id, kind: 'arrow' });
    }
  }
  return result;
}

function findEnclosedZones(
  zones: ZoneAnnotation[],
  bbox: NormBBox,
): SelectedObject[] {
  const result: SelectedObject[] = [];
  for (const zone of zones) {
    if (zone.points.some((pt) => isInsideBBox(pt.x, pt.y, bbox))) {
      result.push({ id: zone.id, kind: 'zone' });
    }
  }
  return result;
}

function isBallEnclosed(ball: BallState | undefined, bbox: NormBBox): boolean {
  return Boolean(ball?.visible && isInsideBBox(ball.x, ball.y, bbox));
}

export function getEnclosedObjects(
  slide: Slide,
  bbox: NormBBox,
): SelectedObject[] {
  const enclosed: SelectedObject[] = [
    ...findEnclosedPlayers(slide.players, bbox),
    ...findEnclosedTexts(slide.texts, bbox),
    ...findEnclosedArrows(slide.arrows, bbox),
    ...findEnclosedZones(slide.zones, bbox),
  ];

  if (isBallEnclosed(slide.ball, bbox)) {
    enclosed.push({ id: 'ball', kind: 'ball' });
  }

  return enclosed;
}
