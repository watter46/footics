import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { PitchPlayer } from '@/lib/types/tactical/domain-entities';
import {
  DEFAULT_442_AWAY,
  DEFAULT_4231_HOME,
  type DefaultFormationPlayer,
} from '@/lib/types/tactical/formations';
import {
  type AspectRatio,
  isVerticalAspectRatio,
  transformCoord,
} from '@/lib/types/tactical/primitives';

function buildTeamPlayers(
  preset: readonly DefaultFormationPlayer[],
  team: 'home' | 'away',
  primaryColor: string,
  aspectRatio: AspectRatio,
): PitchPlayer[] {
  const isVertical = isVerticalAspectRatio(aspectRatio);
  return preset.map((p) => {
    const rawPos = { x: p.x, y: p.y };
    const pos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    return {
      id: crypto.randomUUID(),
      team,
      area: 'pitch',
      shirtNo: p.shirtNo,
      position: p.position,
      x: clampToScreenNorm(pos.x),
      y: clampToScreenNorm(pos.y),
      style: {
        markerType: 'circle',
        insideContent: 'number',
        bottomLabel: 'name',
        color: primaryColor,
        strokeColor: '#ffffff',
        strokeWidth: 2,
        sizeScale: 1.0,
        numberSizeScale: 1.0,
        labelSizeScale: 1.0,
      },
      connectLines: [],
      badges: [],
    };
  });
}

export function createDefaultDomainPlayers(
  homeColor = '#034694',
  awayColor = '#ef4444',
  aspectRatio: AspectRatio = '4:5',
): PitchPlayer[] {
  return [
    ...buildTeamPlayers(DEFAULT_4231_HOME, 'home', homeColor, aspectRatio),
    ...buildTeamPlayers(DEFAULT_442_AWAY, 'away', awayColor, aspectRatio),
  ];
}
