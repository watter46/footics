import { getTeamFormationAtMinute } from '@/lib/data/formation-utils';
import {
  type FormationType,
  getFormationActualPos,
  getFormationActualPosVertical,
} from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { parseWhoScoredFormationName } from '@/lib/tactical/formations';
import { matchPlayersToFormationPositions } from '@/lib/tactical/player-formatting';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  BenchPlayer,
  DomainPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import {
  type DomainTacticalProject,
  DomainTacticalProjectSchema,
} from '@/lib/types/tactical/domain-hierarchy';
import type { MarkerStyle } from '@/lib/types/tactical/player';
import {
  type AspectRatio,
  isVerticalAspectRatio,
  transformCoord,
} from '@/lib/types/tactical/primitives';
import {
  DEFAULT_PITCH_APPEARANCE,
  DEFAULT_SCREEN_BACKGROUND,
  getDefaultBoundaryBoxForAspect,
} from '@/lib/types/tactical/slide';
import type { Match, Player, Team } from '@/types';

interface MatchSquadItem extends Omit<Partial<Player>, 'position'> {
  playerId: number;
  name: string;
  shirtNo?: number;
  position?: string;
  photoUrl?: string;
  slotVertical?: number;
  slotHorizontal?: number;
}

function getBenchRank(position?: string): number {
  if (!position) return 5;
  const p = position.toUpperCase().trim();
  if ('FW,CF,ST,LW,RW,SS,AML,AMR'.includes(p)) return 1;
  if ('MF,DM,CM,AM,LM,RM,DMC,MC,AMC'.includes(p)) return 2;
  if ('DF,CB,LB,RB,LWB,RWB,DC,DL,DR'.includes(p)) return 3;
  return p === 'GK' ? 4 : 5;
}

function buildTeamDomainPlayers(
  teamObj: Team | undefined,
  teamSide: 'home' | 'away',
  minute: number,
  primaryColor: string,
  aspectRatio: AspectRatio,
): { players: DomainPlayer[]; formation: FormationType } {
  const result = getTeamFormationAtMinute(teamObj, minute);
  const formation = parseWhoScoredFormationName(
    result.formationName || '4-4-2',
  );
  const positions =
    FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['4-2-3-1'] || [];
  const isVertical = isVerticalAspectRatio(aspectRatio);

  const starters: MatchSquadItem[] = result.players.map((p) => {
    const slot = result.slotPositions[p.playerId];
    return {
      ...p,
      slotVertical: slot?.vertical,
      slotHorizontal: slot?.horizontal,
    };
  });
  const baseStyle: MarkerStyle = {
    markerType: 'circle',
    insideContent: 'photo',
    bottomLabel: 'name',
    color: primaryColor,
    strokeColor: '#ffffff',
    strokeWidth: 2,
    sizeScale: 1.0,
    numberSizeScale: 1.0,
    labelSizeScale: 1.0,
  };

  const matched = matchPlayersToFormationPositions(starters, positions);
  const pitchPlayers: PitchPlayer[] = matched.map(
    ({ player: sp, templatePos }, idx) => {
      const gkBasePos = { x: teamSide === 'home' ? 7 : 93, y: 50 };
      const coord =
        templatePos.position === 'GK'
          ? isVertical
            ? transformCoord(gkBasePos, '16:9', aspectRatio)
            : gkBasePos
          : isVertical
            ? getFormationActualPosVertical(templatePos, teamSide, 'full')
            : getFormationActualPos(templatePos, teamSide, 'full');
      return {
        id: crypto.randomUUID(),
        playerId: String(sp.playerId),
        name: sp.name,
        shirtNo: String(sp.shirtNo ?? idx + 1),
        position:
          sp.position && sp.position !== 'Sub'
            ? sp.position
            : (templatePos.position ?? sp.position),
        team: teamSide,
        area: 'pitch',
        x: clampToScreenNorm(coord.x),
        y: clampToScreenNorm(coord.y),
        style: { ...baseStyle, photoUrl: sp.photoUrl },
        connectLines: [],
        badges: [],
      };
    },
  );

  const sortedBench = [...result.benchPlayers].sort((a, b) => {
    const rankDiff = getBenchRank(a.position) - getBenchRank(b.position);
    if (rankDiff !== 0) return rankDiff;
    const noA = Number.parseInt(String(a.shirtNo ?? ''), 10);
    const noB = Number.parseInt(String(b.shirtNo ?? ''), 10);
    return (Number.isNaN(noA) ? 9999 : noA) - (Number.isNaN(noB) ? 9999 : noB);
  });
  const xCols = [20, 50, 80];
  const benchPlayers: BenchPlayer[] = sortedBench.map((sub, idx) => ({
    id: crypto.randomUUID(),
    playerId: String(sub.playerId),
    name: sub.name,
    shirtNo: String(sub.shirtNo ?? 99),
    position: sub.position,
    team: teamSide,
    area: 'bench',
    x: clampToScreenNorm(xCols[idx % 3]),
    y: clampToScreenNorm(14 + Math.floor(idx / 3) * 22),
    style: {
      ...baseStyle,
      photoUrl: (sub as Player & { photoUrl?: string }).photoUrl,
    },
  }));

  return { players: [...pitchPlayers, ...benchPlayers], formation };
}

export interface BuildMatchToDomainProjectOptions {
  readonly minute?: number;
  readonly aspectRatio?: AspectRatio;
  readonly homeColor?: string;
  readonly awayColor?: string;
  readonly projectId?: string;
  readonly phaseId?: string;
  readonly slideId?: string;
  readonly now?: string;
}

export interface MatchDomainProjectBundle {
  readonly project: DomainTacticalProject;
  readonly activePhaseId: string;
  readonly activeSlideId: string;
}

export function buildMatchToDomainProject(
  match: Match,
  options: BuildMatchToDomainProjectOptions = {},
): MatchDomainProjectBundle {
  const minute = options.minute ?? 0;
  const aspectRatio = options.aspectRatio ?? '4:5';
  const homeColor = options.homeColor ?? '#034694';
  const awayColor = options.awayColor ?? '#ef4444';
  const now = options.now ?? new Date().toISOString();
  const projectId = options.projectId ?? crypto.randomUUID();
  const phaseId = options.phaseId ?? crypto.randomUUID();
  const slideId = options.slideId ?? crypto.randomUUID();

  const home = buildTeamDomainPlayers(
    match.teams?.home as Team | undefined,
    'home',
    minute,
    homeColor,
    aspectRatio,
  );
  const away = buildTeamDomainPlayers(
    match.teams?.away as Team | undefined,
    'away',
    minute,
    awayColor,
    aspectRatio,
  );

  const title =
    match.homeTeam?.name && match.awayTeam?.name
      ? `${match.homeTeam.name} vs ${match.awayTeam.name} (${minute}')`
      : 'Untitled Project';

  const project = DomainTacticalProjectSchema.parse({
    id: projectId,
    version: '3.0.0',
    title,
    createdAt: now,
    updatedAt: now,
    homeColor: { primary: homeColor },
    awayColor: { primary: awayColor },
    pitchAppearance: { ...DEFAULT_PITCH_APPEARANCE },
    screenBackground: { ...DEFAULT_SCREEN_BACKGROUND },
    matchId: String(match.id),
    matchFormations: {
      home: home.formation,
      away: away.formation,
    },
    tags: [],
    phases: [
      {
        id: phaseId,
        name: 'Phase 1',
        aspectRatio,
        boundaryBox: getDefaultBoundaryBoxForAspect(aspectRatio),
        backgroundType: 'pitch',
        slides: [
          {
            id: slideId,
            index: 0,
            label: 'Scene 1',
            players: [...home.players, ...away.players],
            arrows: [],
            zones: [],
            texts: [],
            ball: {
              x: clampToScreenNorm(50),
              y: clampToScreenNorm(50),
              visible: true,
            },
            transitionDurationMs: 1000,
            pauseMs: 500,
            easing: 'ease-in-out',
          },
        ],
      },
    ],
  });

  return { project, activePhaseId: phaseId, activeSlideId: slideId };
}
