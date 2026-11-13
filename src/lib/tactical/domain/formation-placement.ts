import {
  type FormationMode,
  type FormationType,
  getFormationActualPos,
  getFormationActualPosVertical,
} from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { matchPlayersToFormationPositions } from '@/lib/tactical/player-formatting';
import {
  clampToScreenNorm,
  type ScreenNormCoord,
} from '@/lib/types/tactical/branded';
import type {
  BenchPlayer,
  DomainPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import {
  type AspectRatio,
  isVerticalAspectRatio,
} from '@/lib/types/tactical/primitives';

export const DEFAULT_DOMAIN_MARKER_STYLE = {
  markerType: 'circle' as const,
  insideContent: 'number' as const,
  bottomLabel: 'name' as const,
  strokeColor: '#ffffff',
  strokeWidth: 2,
  sizeScale: 1.0,
  numberSizeScale: 1.0,
  labelSizeScale: 1.0,
};

export function createDefaultDomainPlayer(
  team: 'home' | 'away' | 'neutral',
  x: number,
  y: number,
  color: string,
  area: 'pitch' | 'bench' = 'pitch',
  id?: string,
): DomainPlayer {
  const base = {
    id: id ?? crypto.randomUUID(),
    team,
    x: clampToScreenNorm(x),
    y: clampToScreenNorm(y),
    style: { ...DEFAULT_DOMAIN_MARKER_STYLE, color },
  };
  return area === 'bench'
    ? { ...base, area: 'bench' }
    : { ...base, area: 'pitch', connectLines: [], badges: [] };
}

export function resolveFormationCoords(
  pos: { top: number; left: number },
  side: 'home' | 'away',
  mode: FormationMode,
  aspectRatio: AspectRatio,
): { x: ScreenNormCoord; y: ScreenNormCoord } {
  const raw = isVerticalAspectRatio(aspectRatio)
    ? getFormationActualPosVertical(pos, side, mode)
    : getFormationActualPos(pos, side, mode, aspectRatio);
  return { x: clampToScreenNorm(raw.x), y: clampToScreenNorm(raw.y) };
}

export function computeDomainSlideAfterFormation(
  slide: {
    readonly players: readonly DomainPlayer[];
    readonly isSidesSwapped?: boolean;
  },
  project: {
    readonly homeColor: { readonly primary: string };
    readonly awayColor: { readonly primary: string };
  },
  aspectRatio: AspectRatio,
  formationName: FormationType,
  mode: FormationMode,
  team: 'home' | 'away',
): readonly DomainPlayer[] {
  const template = FORMATION_POSITIONS[formationName];
  if (!template) return slide.players;
  const isSwapped = slide.isSidesSwapped ?? false;
  const effectiveSide: 'home' | 'away' = isSwapped
    ? team === 'home'
      ? 'away'
      : 'home'
    : team;
  const primaryColor =
    team === 'home' ? project.homeColor.primary : project.awayColor.primary;
  const otherPlayers = slide.players.filter((p) => p.team !== team);
  const teamBench = slide.players.filter(
    (p): p is BenchPlayer => p.team === team && p.area === 'bench',
  );
  const teamPitch = slide.players.filter(
    (p): p is PitchPlayer => p.team === team && p.area === 'pitch',
  );

  if (teamPitch.length === 0) {
    const created: DomainPlayer[] = template.map((tPos) => {
      const coords = resolveFormationCoords(
        tPos,
        effectiveSide,
        mode,
        aspectRatio,
      );
      return {
        ...(createDefaultDomainPlayer(
          team,
          coords.x,
          coords.y,
          primaryColor,
          'pitch',
        ) as PitchPlayer),
        shirtNo: String(tPos.id),
        position: tPos.position,
      };
    });
    return [...otherPlayers, ...created, ...teamBench];
  }

  const matched = matchPlayersToFormationPositions([...teamPitch], template);
  const updatedPitch = matched.map(({ player, templatePos }) => {
    const coords = resolveFormationCoords(
      templatePos,
      effectiveSide,
      mode,
      aspectRatio,
    );
    return {
      ...player,
      position: templatePos.position,
      x: coords.x,
      y: coords.y,
    };
  });
  return [...otherPlayers, ...updatedPitch, ...teamBench];
}
