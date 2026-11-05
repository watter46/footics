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
  isSidesSwapped?: boolean,
): { pitchPlayers: Player[]; benchPlayers: Player[] } {
  const positions = FORMATION_POSITIONS[formationName];
  if (!positions) {
    return { pitchPlayers: [], benchPlayers: existingPool };
  }

  const isVertical = isVerticalAspectRatio(aspectRatio);
  const pitchPlayers: Player[] = [];
  positions.forEach((pos, idx) => {
    const rawPos = getFormationActualPos(pos, team, mode, aspectRatio);
    let targetPos = rawPos;

    // GK 位置の最適化（ゴールライン直前・中央）
    if (pos.position === 'GK') {
      const gkBasePos = { x: team === 'home' ? 7 : 93, y: 50 };
      targetPos = isVertical
        ? transformCoord(gkBasePos, '16:9', aspectRatio)
        : gkBasePos;
    }

    // ピッチ白線枠内 (3..97) への強制収容
    const clampedX = Math.max(3, Math.min(97, targetPos.x));
    const clampedY = Math.max(3, Math.min(97, targetPos.y));

    const finalX = isSidesSwapped ? 100 - clampedX : clampedX;
    const finalY = isSidesSwapped ? 100 - clampedY : clampedY;

    let player = existingPool[idx];
    if (player) {
      player = {
        ...player,
        area: 'pitch',
        x: finalX,
        y: finalY,
        position:
          player.position && player.position !== 'Sub'
            ? player.position
            : pos.position,
      };
    } else {
      player = createDefaultPlayer(team, finalX, finalY, primaryColor);
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
    slide.isSidesSwapped,
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
    slide.isSidesSwapped,
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
