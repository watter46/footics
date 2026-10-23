import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { getTeamFormationAtMinute } from '@/lib/data/formation-utils';
import { parseWhoScoredFormationName } from '@/lib/tactical/formations';
import {
  convertSquadToTacticalPlayers,
  type SquadPlayerItem,
} from '@/lib/tactical/squad-to-tactical-bridge';
import type {
  AspectRatio,
  Player as TacticalPlayer,
  TacticalProject,
} from '@/lib/types/tactical-unified';
import type { Match, Player, Team } from '@/types';

export interface BuildMatchTacticalPlayersOptions {
  match: Match;
  minute?: number;
  homeColor?: string;
  awayColor?: string;
  aspectRatio?: AspectRatio;
}

export interface MatchTacticalPlayersResult {
  homePlayers: TacticalPlayer[];
  awayPlayers: TacticalPlayer[];
  allPlayers: TacticalPlayer[];
  homeFormation: string;
  awayFormation: string;
}

/**
 * 試合データと指定分数から、ホーム・アウェイのピッチ上22選手およびベンチ選手を生成する
 */
export function buildMatchTacticalPlayers({
  match,
  minute = 0,
  homeColor = '#034694',
  awayColor = '#ef4444',
  aspectRatio = '16:9',
}: BuildMatchTacticalPlayersOptions): MatchTacticalPlayersResult {
  const homeTeam = match.teams?.home as Team | undefined;
  const awayTeam = match.teams?.away as Team | undefined;

  const homeResult = getTeamFormationAtMinute(homeTeam, minute);
  const awayResult = getTeamFormationAtMinute(awayTeam, minute);

  const homeFormation = parseWhoScoredFormationName(
    homeResult.formationName || '4-4-2',
  );
  const awayFormation = parseWhoScoredFormationName(
    awayResult.formationName || '4-4-2',
  );

  const homePitchIds = new Set(homeResult.playerIds);
  const homeBench = (homeTeam?.players || [])
    .filter((p: Player) => !homePitchIds.has(p.playerId))
    .map((p: Player) => ({ ...p, isFirstEleven: false }));
  const homeSquad: SquadPlayerItem[] = [
    ...homeResult.players.map((p) => ({ ...p, isFirstEleven: true })),
    ...homeBench,
  ];

  const awayPitchIds = new Set(awayResult.playerIds);
  const awayBench = (awayTeam?.players || [])
    .filter((p: Player) => !awayPitchIds.has(p.playerId))
    .map((p: Player) => ({ ...p, isFirstEleven: false }));
  const awaySquad: SquadPlayerItem[] = [
    ...awayResult.players.map((p) => ({ ...p, isFirstEleven: true })),
    ...awayBench,
  ];

  const homePlayers = convertSquadToTacticalPlayers(homeSquad, {
    team: 'home',
    formation: homeFormation,
    mode: 'half',
    primaryColor: homeColor,
    aspectRatio,
  });

  const awayPlayers = convertSquadToTacticalPlayers(awaySquad, {
    team: 'away',
    formation: awayFormation,
    mode: 'half',
    primaryColor: awayColor,
    aspectRatio,
  });

  return {
    homePlayers,
    awayPlayers,
    allPlayers: [...homePlayers, ...awayPlayers],
    homeFormation,
    awayFormation,
  };
}

export interface InjectMatchToTacticalOptions {
  match: Match;
  minute?: number;
  slideId?: string;
}

/**
 * 試合データと指定分数から Tactical ストアに22人とフォーメーションを反映する
 */
export function injectMatchToTactical({
  match,
  minute = 0,
  slideId,
}: InjectMatchToTacticalOptions): void {
  const store = useTacticalUnifiedStore.getState();
  const targetSlideId = slideId || store.activeSlideId;
  const project = store.project;

  const { allPlayers } = buildMatchTacticalPlayers({
    match,
    minute,
    homeColor: project.homeColor.primary,
    awayColor: project.awayColor.primary,
    aspectRatio: project.aspectRatio,
  });

  const title =
    match.homeTeam?.name && match.awayTeam?.name
      ? `${match.homeTeam.name} vs ${match.awayTeam.name} (${minute}')`
      : project.title;

  const targetSlide = project.slides.find((s) => s.id === targetSlideId);
  if (!targetSlide) return;

  const neutralPlayers = targetSlide.players.filter(
    (p) => p.team === 'neutral',
  );
  const updatedPlayers = [...neutralPlayers, ...allPlayers];

  const updatedSlides = project.slides.map((s) =>
    s.id === targetSlideId ? { ...s, players: updatedPlayers } : s,
  );

  const updatedProject: TacticalProject = {
    ...project,
    matchId: String(match.id),
    title,
    slides: updatedSlides,
    updatedAt: new Date().toISOString(),
  };

  store.loadProject(updatedProject);
}
