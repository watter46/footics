import {
  type ScreenNormPoint,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  BenchPlayer,
  DomainPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { MarkerStyle } from '@/lib/types/tactical/player';

export interface SquadMemberInput {
  readonly playerId: string;
  readonly name: string;
  readonly shirtNo: string;
  readonly position: string;
  readonly isStarter: boolean;
  readonly pitchPoint?: ScreenNormPoint;
  readonly photoUrl?: string;
}

export function translateSquadToDomainPlayers(
  members: readonly SquadMemberInput[],
  team: 'home' | 'away',
  teamColor: string,
): readonly DomainPlayer[] {
  return members.map((member, index): DomainPlayer => {
    const style: MarkerStyle = {
      markerType: 'circle',
      insideContent: member.photoUrl ? 'photo' : 'number',
      photoUrl: member.photoUrl,
      bottomLabel: 'name',
      color: teamColor,
      strokeColor: '#ffffff',
      strokeWidth: 2,
      sizeScale: 1.0,
      numberSizeScale: 1.0,
      labelSizeScale: 1.0,
    };

    if (member.isStarter) {
      const defaultPitchPoint =
        member.pitchPoint ?? toScreenNormPoint(team === 'home' ? 25 : 75, 50);

      const pitchPlayer: PitchPlayer = {
        id: member.playerId,
        playerId: member.playerId,
        name: member.name,
        shirtNo: member.shirtNo,
        position: member.position,
        team,
        area: 'pitch',
        x: defaultPitchPoint.x,
        y: defaultPitchPoint.y,
        style,
        connectLines: [],
        badges: [],
      };
      return pitchPlayer;
    }

    const defaultBenchPoint =
      member.pitchPoint ?? toScreenNormPoint(10 + (index % 10) * 8, 105);

    const benchPlayer: BenchPlayer = {
      id: member.playerId,
      playerId: member.playerId,
      name: member.name,
      shirtNo: member.shirtNo,
      position: member.position,
      team,
      area: 'bench',
      x: defaultBenchPoint.x,
      y: defaultBenchPoint.y,
      style,
    };
    return benchPlayer;
  });
}
