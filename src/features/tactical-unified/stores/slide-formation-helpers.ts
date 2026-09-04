import type { FormationMode, FormationType } from '@/lib/data/formations';
import { getFormationActualPos } from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import type {
  AspectRatio,
  Player,
  Slide,
  TacticalProject,
} from '@/lib/types/tactical-unified';
import {
  createDefaultPlayer,
  isVerticalAspectRatio,
  transformCoord,
} from '@/lib/types/tactical-unified';

/**
 * 指定チームの選手プールをフォーメーション位置に合わせて再構成
 */
export function buildTeamFormationPlayers(
  team: 'home' | 'away',
  formationName: FormationType,
  mode: FormationMode,
  existingPool: Player[],
  primaryColor: string,
  aspectRatio: AspectRatio = '16:9',
): { pitchPlayers: Player[]; benchPlayers: Player[] } {
  const positions = FORMATION_POSITIONS[formationName];
  if (!positions) {
    return { pitchPlayers: [], benchPlayers: existingPool };
  }

  const isVertical = isVerticalAspectRatio(aspectRatio);
  const pitchPlayers: Player[] = [];
  positions.forEach((pos, idx) => {
    const rawPos = getFormationActualPos(pos, team, mode);
    const actualPos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    let player = existingPool[idx];
    if (player) {
      player = {
        ...player,
        area: 'pitch',
        x: Math.max(0, Math.min(100, actualPos.x)),
        y: Math.max(0, Math.min(100, actualPos.y)),
        position: pos.position,
      };
    } else {
      player = createDefaultPlayer(
        team,
        Math.max(0, Math.min(100, actualPos.x)),
        Math.max(0, Math.min(100, actualPos.y)),
        primaryColor,
      );
      player.shirtNo = String(pos.id);
      player.position = pos.position;
    }
    pitchPlayers.push(player);
  });

  const benchPlayers: Player[] = existingPool
    .slice(positions.length)
    .map((p) => ({
      ...p,
      area: 'bench' as const,
      visionCone: undefined,
      badges: [],
      connectLines: [],
    }));

  return { pitchPlayers, benchPlayers };
}

/**
 * フォーメーション適用後のスライドを計算
 */
export function computeSlideAfterFormation(
  slide: Slide,
  project: TacticalProject,
  formationName: FormationType,
  mode: FormationMode,
  team: 'home' | 'away',
): Slide {
  const teamPitchPlayers = slide.players.filter(
    (p) => p.team === team && p.area === 'pitch',
  );
  const teamBenchPlayers = slide.players.filter(
    (p) => p.team === team && p.area === 'bench',
  );
  const otherPlayers = slide.players.filter((p) => p.team !== team);
  const existingPool = [...teamPitchPlayers, ...teamBenchPlayers];
  const primaryColor =
    team === 'home' ? project.homeColor.primary : project.awayColor.primary;

  const aspect = slide.aspectRatio ?? project.aspectRatio ?? '16:9';
  const { pitchPlayers, benchPlayers } = buildTeamFormationPlayers(
    team,
    formationName,
    mode,
    existingPool,
    primaryColor,
    aspect,
  );

  return {
    ...slide,
    players: [...otherPlayers, ...pitchPlayers, ...benchPlayers],
  };
}

/**
 * 単一チームフォーメーション適用（相手チームをベンチ退避）後のスライドを計算
 */
export function computeSlideAfterSingleTeamFormation(
  slide: Slide,
  project: TacticalProject,
  formationName: FormationType,
  mode: FormationMode,
  team: 'home' | 'away',
): Slide {
  const otherTeam = team === 'home' ? 'away' : 'home';
  const updatedOtherPlayers = slide.players
    .filter((p) => p.team === otherTeam)
    .map((p) => ({
      ...p,
      area: 'bench' as const,
      visionCone: undefined,
      badges: [],
      connectLines: [],
    }));

  const neutralPlayers = slide.players.filter((p) => p.team === 'neutral');
  const teamPitchPlayers = slide.players.filter(
    (p) => p.team === team && p.area === 'pitch',
  );
  const teamBenchPlayers = slide.players.filter(
    (p) => p.team === team && p.area === 'bench',
  );
  const existingPool = [...teamPitchPlayers, ...teamBenchPlayers];
  const primaryColor =
    team === 'home' ? project.homeColor.primary : project.awayColor.primary;

  const aspect = slide.aspectRatio ?? project.aspectRatio ?? '16:9';
  const { pitchPlayers, benchPlayers } = buildTeamFormationPlayers(
    team,
    formationName,
    mode,
    existingPool,
    primaryColor,
    aspect,
  );

  return {
    ...slide,
    players: [
      ...neutralPlayers,
      ...updatedOtherPlayers,
      ...pitchPlayers,
      ...benchPlayers,
    ],
  };
}
