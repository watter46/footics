import {
  getSlide,
  updateSlideInProject,
} from '@/features/tactical-unified/stores/store-helpers';
import {
  defaultTacticalUnifiedStore,
  type TacticalUnifiedStoreApi,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  type FormationMode,
  type FormationType,
  getFormationActualPos,
  getFormationActualPosVertical,
} from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { matchPlayersToFormationPositions } from '@/lib/tactical/player-formatting';
import type {
  AspectRatio,
  Player as TacticalPlayer,
  TacticalProject,
} from '@/lib/types/tactical-unified';
import {
  computeBenchGridPositions,
  createDefaultPlayer,
  isVerticalAspectRatio,
} from '@/lib/types/tactical-unified';
import type { Player } from '@/types';

export interface SquadPlayerItem extends Omit<Partial<Player>, 'position'> {
  playerId: number;
  name: string;
  shirtNo?: number;
  position?: string;
  isFirstEleven?: boolean;
  photoBlob?: Blob;
  photoUrl?: string;
  slotVertical?: number;
  slotHorizontal?: number;
}

export interface InjectTeamSquadOptions {
  teamName?: string;
  team: 'home' | 'away';
  players: SquadPlayerItem[];
  formation?: FormationType;
  mode?: FormationMode;
  slideId?: string;
  storeApi?: TacticalUnifiedStoreApi;
}

/**
 * 渡された選手リストとフォーメーション情報から、ピッチ配置(11人)とベンチ選手(控え)の TacticalPlayer 配列を生成
 * デフォルトで insideContent: 'photo' を適用
 */
export function convertSquadToTacticalPlayers(
  players: SquadPlayerItem[],
  options: {
    team: 'home' | 'away';
    formation?: FormationType;
    mode?: FormationMode;
    primaryColor: string;
    aspectRatio?: AspectRatio;
  },
): TacticalPlayer[] {
  const {
    team,
    formation = '4-2-3-1',
    mode = 'full',
    primaryColor,
    aspectRatio = '16:9',
  } = options;

  const positions =
    FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['4-2-3-1'] || [];
  const isVertical = isVerticalAspectRatio(aspectRatio);

  // 1. スタメン候補の選出 (isFirstEleven 優先、または先頭11人)
  const starters: SquadPlayerItem[] = [];
  const substitutes: SquadPlayerItem[] = [];

  const firstEleven = players.filter((p) => p.isFirstEleven);
  const others = players.filter((p) => !p.isFirstEleven);

  const pool = [...firstEleven, ...others];
  pool.forEach((p, idx) => {
    if (idx < positions.length) {
      starters.push(p);
    } else {
      substitutes.push(p);
    }
  });

  const tacticalPlayers: TacticalPlayer[] = [];

  // 2. スタメンの配置 (2D 適性マッチング)
  const matchedStarters = matchPlayersToFormationPositions(starters, positions);
  matchedStarters.forEach(({ player: sp, templatePos }, idx) => {
    const coord = isVertical
      ? getFormationActualPosVertical(templatePos, team, mode)
      : getFormationActualPos(templatePos, team, mode);

    const tacticalPlayer = createDefaultPlayer(
      team,
      coord.x,
      coord.y,
      primaryColor,
    );

    tacticalPlayer.playerId = String(sp.playerId);
    tacticalPlayer.name = sp.name;
    tacticalPlayer.shirtNo = String(sp.shirtNo || idx + 1);
    tacticalPlayer.position =
      sp.position && sp.position !== 'Sub'
        ? sp.position
        : (templatePos.position ?? sp.position);
    tacticalPlayer.area = 'pitch';

    tacticalPlayer.style.insideContent = 'photo';
    tacticalPlayer.style.photoUrl = sp.photoUrl;

    tacticalPlayers.push(tacticalPlayer);
  });

  // 3. ベンチ・サブメンバーの配置
  const benchPlayers: TacticalPlayer[] = [];
  substitutes.forEach((sub) => {
    // ベンチ選手は computeBenchGridPositions でグリッド座標が付与される
    const benchPlayer = createDefaultPlayer(team, 0, 0, primaryColor);

    benchPlayer.playerId = String(sub.playerId);
    benchPlayer.name = sub.name;
    benchPlayer.shirtNo = String(sub.shirtNo || 99);
    benchPlayer.position = sub.position;
    benchPlayer.area = 'bench';

    benchPlayer.style.insideContent = 'photo';
    benchPlayer.style.photoUrl = sub.photoUrl;

    benchPlayers.push(benchPlayer);
  });

  tacticalPlayers.push(...computeBenchGridPositions(benchPlayers));

  return tacticalPlayers;
}

/**
 * スカッド画面または外部から useTacticalUnifiedStore のアクティブスライドへ一括流し込みを行う
 */
export function injectTeamSquadToTactical({
  teamName: _teamName,
  team = 'home',
  players,
  formation = '4-2-3-1',
  mode = 'full',
  slideId,
  storeApi = defaultTacticalUnifiedStore,
}: InjectTeamSquadOptions): void {
  const store = storeApi.getState();
  const targetSlideId = slideId || store.activeSlideId;
  const project = store.project;

  const primaryColor =
    team === 'home' ? project.homeColor.primary : project.awayColor.primary;

  const newTeamPlayers = convertSquadToTacticalPlayers(players, {
    team,
    formation,
    mode,
    primaryColor,
    aspectRatio: project.aspectRatio,
  });

  // 既存の同一チーム選手を置き換え、相手チーム選手は維持
  const targetSlide = getSlide(project, targetSlideId);
  if (!targetSlide) return;

  const otherTeamPlayers = targetSlide.players.filter((p) => p.team !== team);
  const updatedPlayers = [...otherTeamPlayers, ...newTeamPlayers];

  // スライド更新
  const updatedProject: TacticalProject = {
    ...updateSlideInProject(project, targetSlideId, (s) => ({
      ...s,
      players: updatedPlayers,
    })),
    updatedAt: new Date().toISOString(),
  };

  store.loadProject(updatedProject);
}
