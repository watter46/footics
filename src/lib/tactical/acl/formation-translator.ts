import { toBenchPlayer } from '@/lib/tactical/domain/invariants';
import { pitchNormToScreenNorm } from '@/lib/tactical/engine/coordinates';
import {
  type ScreenNormPoint,
  toPitchNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  DomainPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

export interface FormationSlotPreset {
  readonly shirtNo: string;
  readonly position: string;
  readonly x: number;
  readonly y: number;
}

export function projectFormationSlotsToScreenNorm(
  slots: readonly FormationSlotPreset[],
  team: 'home' | 'away',
  mode?: 'full' | 'half',
): readonly {
  readonly shirtNo: string;
  readonly position: string;
  readonly point: ScreenNormPoint;
}[] {
  const isHalfMode = mode === 'half';
  return slots.map((slot) => {
    let pitchX: number;
    let pitchY: number;

    if (isHalfMode) {
      if (team === 'home') {
        pitchX = slot.x;
        pitchY = slot.y;
      } else {
        pitchX = 100 - slot.x;
        pitchY = 100 - slot.y;
      }
    } else {
      // mode === 'full': home occupies 0..50%, away occupies 50..100%
      if (team === 'home') {
        pitchX = slot.x * 0.5;
        pitchY = slot.y;
      } else {
        pitchX = 100 - slot.x * 0.5;
        pitchY = 100 - slot.y;
      }
    }

    const point = pitchNormToScreenNorm(toPitchNormPoint(pitchX, pitchY));
    return {
      shirtNo: slot.shirtNo,
      position: slot.position,
      point,
    };
  });
}

export function applyFormationPresetToSlide(
  slide: DomainSlide,
  slots: readonly FormationSlotPreset[],
  team: 'home' | 'away',
  mode?: 'full' | 'half',
): DomainSlide {
  const projectedSlots = projectFormationSlotsToScreenNorm(slots, team, mode);

  const otherPlayers = slide.players.filter((p) => p.team !== team);
  const teamPitchPlayers = slide.players.filter(
    (p) => p.team === team && p.area === 'pitch',
  );
  const teamBenchPlayers = slide.players.filter(
    (p) => p.team === team && p.area === 'bench',
  );
  const teamPool = [...teamPitchPlayers, ...teamBenchPlayers];

  const updatedTeamPlayers: DomainPlayer[] = [];

  for (let i = 0; i < projectedSlots.length; i++) {
    const slot = projectedSlots[i];
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
        x: slot.point.x,
        y: slot.point.y,
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
        id: `player-${team}-${i + 1}-${Date.now()}`,
        shirtNo: slot.shirtNo,
        position: slot.position,
        team,
        area: 'pitch',
        x: slot.point.x,
        y: slot.point.y,
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

  for (let i = projectedSlots.length; i < teamPool.length; i++) {
    updatedTeamPlayers.push(toBenchPlayer(teamPool[i]));
  }

  return {
    ...slide,
    players: [...otherPlayers, ...updatedTeamPlayers],
  };
}
