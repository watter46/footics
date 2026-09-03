import {
  type FormationMode,
  type FormationType,
  getFormationActualPos,
  getFormationActualPosVertical,
} from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import type {
  AspectRatio,
  Player as TacticalPlayer,
  TacticalProject,
} from '@/lib/types/tactical-unified';
import {
  createDefaultPlayer,
  isVerticalAspectRatio,
} from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import type { Player } from '@/types';

export interface SquadPlayerItem extends Partial<Player> {
  playerId: number;
  name: string;
  shirtNo?: number;
  position?: Player['position'];
  isFirstEleven?: boolean;
  photoBlob?: Blob;
  photoUrl?: string;
}

export interface InjectTeamSquadOptions {
  teamName?: string;
  team: 'home' | 'away';
  players: SquadPlayerItem[];
  formation?: FormationType;
  mode?: FormationMode;
  slideId?: string;
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
    mode = 'half',
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

  // 2. スタメンの配置
  starters.forEach((sp, idx) => {
    const templatePos = positions[idx] || { top: 50, left: 50 };
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
    tacticalPlayer.position = sp.position;
    tacticalPlayer.area = 'pitch';

    const photoUrl =
      sp.photoUrl ||
      (sp.photoBlob && typeof URL !== 'undefined' && URL.createObjectURL
        ? URL.createObjectURL(sp.photoBlob)
        : undefined);

    if (photoUrl) {
      tacticalPlayer.style.insideContent = 'photo';
      tacticalPlayer.style.photoUrl = photoUrl;
    } else {
      tacticalPlayer.style.insideContent = 'number';
    }

    tacticalPlayers.push(tacticalPlayer);
  });

  // 3. ベンチ・サブメンバーの配置
  substitutes.forEach((sub) => {
    // ベンチ選手は初期座標 (0, 0) で area: 'bench'
    const benchPlayer = createDefaultPlayer(team, 0, 0, primaryColor);

    benchPlayer.playerId = String(sub.playerId);
    benchPlayer.name = sub.name;
    benchPlayer.shirtNo = String(sub.shirtNo || 99);
    benchPlayer.position = sub.position;
    benchPlayer.area = 'bench';

    const photoUrl =
      sub.photoUrl ||
      (sub.photoBlob && typeof URL !== 'undefined' && URL.createObjectURL
        ? URL.createObjectURL(sub.photoBlob)
        : undefined);

    if (photoUrl) {
      benchPlayer.style.insideContent = 'photo';
      benchPlayer.style.photoUrl = photoUrl;
    } else {
      benchPlayer.style.insideContent = 'number';
    }

    tacticalPlayers.push(benchPlayer);
  });

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
  mode = 'half',
  slideId,
}: InjectTeamSquadOptions): void {
  const store = useTacticalUnifiedStore.getState();
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
  const targetSlide = project.slides.find((s) => s.id === targetSlideId);
  if (!targetSlide) return;

  const otherTeamPlayers = targetSlide.players.filter((p) => p.team !== team);
  const updatedPlayers = [...otherTeamPlayers, ...newTeamPlayers];

  // スライド更新
  const updatedSlides = project.slides.map((s) =>
    s.id === targetSlideId ? { ...s, players: updatedPlayers } : s,
  );

  const updatedProject: TacticalProject = {
    ...project,
    slides: updatedSlides,
    updatedAt: new Date().toISOString(),
  };

  store.loadProject(updatedProject);
}
