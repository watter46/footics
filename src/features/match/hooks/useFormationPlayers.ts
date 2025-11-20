import { useMemo } from 'react';
import {
  FORMATION_POSITIONS,
  type FormationPosition,
  type FormationType,
} from '@/lib/formation-template';
import type { Match, Player } from '@/lib/db';
import type { FormationPlayers } from '@/types/formation';

interface UseFormationPlayersParams {
  match: Match;
  formation: FormationType;
  resolvedPlayers?: FormationPlayers;
}

interface UseFormationPlayersResult {
  formationSlots: FormationPosition[];
  homeFormationPlayers: FormationPlayers;
}

const buildPlaceholderPlayer = (teamId: number, position: string): Player => ({
  teamId,
  number: Number.NaN,
  name: '',
  position,
});

export const useFormationPlayers = ({
  match,
  formation,
  resolvedPlayers,
}: UseFormationPlayersParams): UseFormationPlayersResult => {
  const subjectTeamId = match.subjectTeamId ?? match.team1Id;

  const formationSlots = useMemo(
    () => FORMATION_POSITIONS[formation] ?? [],
    [formation]
  );

  const homeFormationPlayers = useMemo(() => {
    const placeholders: FormationPlayers = {};

    formationSlots.forEach(slot => {
      placeholders[slot.id] = buildPlaceholderPlayer(
        subjectTeamId,
        slot.position
      );
    });

    if (!resolvedPlayers) {
      return placeholders;
    }

    Object.entries(resolvedPlayers).forEach(([positionIdKey, player]) => {
      if (!player || typeof player.teamId !== 'number') {
        return;
      }

      const positionId = Number(positionIdKey);
      if (!Number.isFinite(positionId)) {
        return;
      }

      if (player.teamId !== subjectTeamId) {
        return;
      }

      placeholders[positionId] = player;
    });

    return placeholders;
  }, [formationSlots, resolvedPlayers, subjectTeamId]);

  return {
    formationSlots,
    homeFormationPlayers,
  };
};
