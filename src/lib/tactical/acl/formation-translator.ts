import { toBenchPlayer } from '@/lib/tactical/domain/invariants';
import type { ScreenNormCoord } from '@/lib/types/tactical/branded';
import type {
  DomainPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

/** フォーメーション 1 スロットの配置結果（ScreenNorm 座標・計算済み）。 */
export interface FormationPlacement {
  readonly shirtNo: string;
  readonly position: string;
  readonly x: ScreenNormCoord;
  readonly y: ScreenNormCoord;
}

export type FormationTeam = 'home' | 'away';
export type FormationIdFactory = (team: FormationTeam, index: number) => string;

/**
 * 指定チームの選手プール（ピッチ → ベンチの順）へ配置を適用する純粋関数。
 * 不足分は createId で新規選手を作成し、余剰はベンチへ戻す。相手チームは無変更。
 */
export function applyFormationPlacementsToSlide(
  slide: DomainSlide,
  placements: readonly FormationPlacement[],
  team: FormationTeam,
  createId: FormationIdFactory,
): DomainSlide {
  const otherPlayers = slide.players.filter((p) => p.team !== team);
  const teamPitchPlayers = slide.players.filter(
    (p) => p.team === team && p.area === 'pitch',
  );
  const teamBenchPlayers = slide.players.filter(
    (p) => p.team === team && p.area === 'bench',
  );
  const teamPool = [...teamPitchPlayers, ...teamBenchPlayers];

  const updatedTeamPlayers: DomainPlayer[] = [];

  for (let i = 0; i < placements.length; i++) {
    const slot = placements[i];
    const existing = teamPool[i];

    if (existing) {
      const pitchPlayer: PitchPlayer = {
        id: existing.id,
        playerId: existing.playerId,
        name: existing.name,
        shirtNo: existing.shirtNo || slot.shirtNo,
        position: slot.position || existing.position,
        team,
        area: 'pitch',
        x: slot.x,
        y: slot.y,
        style: existing.style,
        locked: existing.locked,
        isCustom: existing.isCustom,
        connectLines: 'connectLines' in existing ? existing.connectLines : [],
        badges: 'badges' in existing ? existing.badges : [],
        visionCone: 'visionCone' in existing ? existing.visionCone : undefined,
        focus: 'focus' in existing ? existing.focus : undefined,
        trajectory: 'trajectory' in existing ? existing.trajectory : undefined,
        trajectoryEffect:
          'trajectoryEffect' in existing
            ? existing.trajectoryEffect
            : undefined,
        markerEffect:
          'markerEffect' in existing ? existing.markerEffect : undefined,
      };
      updatedTeamPlayers.push(pitchPlayer);
    } else {
      const newPlayer: PitchPlayer = {
        id: createId(team, i),
        shirtNo: slot.shirtNo,
        position: slot.position,
        team,
        area: 'pitch',
        x: slot.x,
        y: slot.y,
        style: {
          markerType: 'circle',
          insideContent: 'number',
          bottomLabel: 'name',
          color: team === 'home' ? '#034694' : '#ef4444',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          sizeScale: 1.0,
          numberSizeScale: 1.0,
          labelSizeScale: 1.0,
        },
        connectLines: [],
        badges: [],
      };
      updatedTeamPlayers.push(newPlayer);
    }
  }

  for (let i = placements.length; i < teamPool.length; i++) {
    updatedTeamPlayers.push(toBenchPlayer(teamPool[i]));
  }

  return {
    ...slide,
    players: [...otherPlayers, ...updatedTeamPlayers],
  };
}

/**
 * 単一チームのフォーメーション適用。相手チームの選手は全員ベンチへ退避し、
 * 中立（neutral）選手は無変更で残す。
 */
export function applySingleTeamFormationToSlide(
  slide: DomainSlide,
  placements: readonly FormationPlacement[],
  team: FormationTeam,
  createId: FormationIdFactory,
): DomainSlide {
  const otherTeam: FormationTeam = team === 'home' ? 'away' : 'home';
  const benched: DomainSlide = {
    ...slide,
    players: slide.players.map((p) =>
      p.team === otherTeam ? toBenchPlayer(p) : p,
    ),
  };
  return applyFormationPlacementsToSlide(benched, placements, team, createId);
}
