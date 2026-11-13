import type { FormationMode, FormationType } from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { matchPlayersToFormationPositions } from '@/lib/tactical/player-formatting';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  BenchPlayer,
  DomainPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { AspectRatio } from '@/lib/types/tactical/primitives';
import type { SeasonFormationPreset } from '@/lib/types/tactical/project';
import {
  createDefaultDomainPlayer,
  DEFAULT_DOMAIN_MARKER_STYLE,
  resolveFormationCoords,
} from './formation-placement';

export interface DomainSquadPlayerItem {
  readonly playerId: number;
  readonly name: string;
  readonly shirtNo?: number | string;
  readonly position?: string;
  readonly isFirstEleven?: boolean;
  readonly photoUrl?: string;
  readonly slotVertical?: number;
  readonly slotHorizontal?: number;
}

function getBenchPosRank(position?: string): number {
  if (!position) return 5;
  const p = position.toUpperCase().trim();
  if ('FW,CF,ST,LW,RW,SS,AML,AMR'.includes(p)) return 1;
  if ('MF,DM,CM,AM,LM,RM,DMC,MC,AMC'.includes(p)) return 2;
  if ('DF,CB,LB,RB,LWB,RWB,DC,DL,DR'.includes(p)) return 3;
  return p === 'GK' ? 4 : 5;
}

function getBenchShirtNoVal(shirtNo?: string): number {
  if (!shirtNo) return Number.POSITIVE_INFINITY;
  const n = Number.parseInt(shirtNo, 10);
  return Number.isNaN(n) ? Number.POSITIVE_INFINITY : n;
}

export function computeDomainBenchGridPositions(
  players: readonly BenchPlayer[],
): BenchPlayer[] {
  const sorted = [...players].sort((a, b) => {
    const rankDiff = getBenchPosRank(a.position) - getBenchPosRank(b.position);
    return rankDiff !== 0
      ? rankDiff
      : getBenchShirtNoVal(a.shirtNo) - getBenchShirtNoVal(b.shirtNo);
  });
  const xCols = [20, 50, 80];
  return sorted.map((p, idx) => ({
    ...p,
    x: clampToScreenNorm(xCols[idx % 3] ?? 20),
    y: clampToScreenNorm(14 + Math.floor(idx / 3) * 22),
  }));
}

export function computeDomainPresetPlayers(
  slide: { readonly players: readonly DomainPlayer[] },
  project: {
    readonly homeColor: { readonly primary: string };
    readonly awayColor: { readonly primary: string };
  },
  team: 'home' | 'away',
  preset: SeasonFormationPreset,
): readonly DomainPlayer[] {
  const primaryColor =
    team === 'home' ? project.homeColor.primary : project.awayColor.primary;
  const otherPlayers = slide.players.filter((p) => p.team !== team);
  const existingTeam = slide.players.filter((p) => p.team === team);
  const existingBench = existingTeam.filter(
    (p): p is BenchPlayer => p.area === 'bench',
  );
  const nextPitch: PitchPlayer[] = preset.players.slice(0, 11).map((p, idx) => {
    const base = existingTeam[idx];
    const x = clampToScreenNorm(team === 'home' ? p.x : 100 - p.x);
    const y = clampToScreenNorm(p.y);
    return {
      ...(base && base.area === 'pitch'
        ? base
        : (createDefaultDomainPlayer(
            team,
            x,
            y,
            primaryColor,
            'pitch',
          ) as PitchPlayer)),
      shirtNo: p.shirtNo,
      position: p.position,
      x,
      y,
      style: {
        ...(base?.style ?? {
          ...DEFAULT_DOMAIN_MARKER_STYLE,
          color: primaryColor,
        }),
        color: primaryColor,
      },
    };
  });
  return [...otherPlayers, ...nextPitch, ...existingBench];
}

export function buildDomainSquadPlayers(
  players: readonly DomainSquadPlayerItem[],
  options: {
    team: 'home' | 'away';
    formation?: FormationType;
    mode?: FormationMode;
    primaryColor: string;
    aspectRatio?: AspectRatio;
  },
): readonly DomainPlayer[] {
  const {
    team,
    formation = '4-2-3-1',
    mode = 'full',
    primaryColor,
    aspectRatio = '16:9',
  } = options;
  const template =
    FORMATION_POSITIONS[formation] ?? FORMATION_POSITIONS['4-2-3-1'];
  const explicit = players.filter((p) => p.isFirstEleven !== false);
  const starters = explicit.length <= 11 ? explicit : explicit.slice(0, 11);
  const starterIds = new Set(starters.map((s) => s.playerId));
  const substitutes = players.filter((p) => !starterIds.has(p.playerId));
  const pitchPlayers: PitchPlayer[] = matchPlayersToFormationPositions(
    [...starters],
    template,
  ).map(({ player, templatePos }) => {
    const coords = resolveFormationCoords(templatePos, team, mode, aspectRatio);
    return {
      ...(createDefaultDomainPlayer(
        team,
        coords.x,
        coords.y,
        primaryColor,
        'pitch',
      ) as PitchPlayer),
      playerId: String(player.playerId),
      name: player.name,
      shirtNo:
        player.shirtNo !== undefined ? String(player.shirtNo) : undefined,
      position: player.position ?? templatePos.position,
      style: {
        ...DEFAULT_DOMAIN_MARKER_STYLE,
        color: primaryColor,
        photoUrl: player.photoUrl,
        insideContent: player.photoUrl ? 'photo' : 'number',
      },
    };
  });
  const rawBench: BenchPlayer[] = substitutes.map((sub) => ({
    ...(createDefaultDomainPlayer(
      team,
      20,
      14,
      primaryColor,
      'bench',
    ) as BenchPlayer),
    playerId: String(sub.playerId),
    name: sub.name,
    shirtNo: sub.shirtNo !== undefined ? String(sub.shirtNo) : undefined,
    position: sub.position,
    style: {
      ...DEFAULT_DOMAIN_MARKER_STYLE,
      color: primaryColor,
      photoUrl: sub.photoUrl,
      insideContent: sub.photoUrl ? 'photo' : 'number',
    },
  }));
  return [...pitchPlayers, ...computeDomainBenchGridPositions(rawBench)];
}
