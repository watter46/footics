'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { getAllMatches } from '@/lib/db/queries';
import { matchKeys } from '@/lib/query-keys';
import { DEFAULT_SEASON } from '@/lib/tactical/chelsea-preset';
import { extractAvailableSeasons } from '@/lib/tactical/season-utils';
import type { EditablePlayerData } from '../components/EditPlayerDialog';
import type {
  IdFilterOption,
  UseTeamSquadClientProps,
  UseTeamSquadClientResult,
} from '../types/squad-client';
import { createSquadActionHandlers } from '../utils/squad-actions';
import {
  computeSquadViewData,
  mergeMasterAndSquadPlayers,
} from '../utils/squad-aggregation';
import { useSeasonPlayers } from './use-player-master';
import { useTeamSquad } from './use-team-squad';

export type {
  IdFilterOption,
  OfficialPlayerOption,
  UseTeamSquadClientProps,
  UseTeamSquadClientResult,
} from '../types/squad-client';

export function useTeamSquadClient({
  teamId = 'chelsea',
  initialSeason = DEFAULT_SEASON,
}: UseTeamSquadClientProps = {}): UseTeamSquadClientResult {
  const router = useRouter();
  const [selectedSeason, setSelectedSeason] = useState<string>(initialSeason);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isCopySeasonOpen, setIsCopySeasonOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<EditablePlayerData | null>(
    null,
  );
  const [idFilter, setIdFilter] = useState<IdFilterOption>('all');

  const matchesQuery = useQuery({
    queryKey: matchKeys.lists(),
    queryFn: () => getAllMatches(),
    staleTime: 300000,
  });

  const availableSeasons = useMemo(
    () =>
      extractAvailableSeasons(matchesQuery.data || [], [
        '26-27',
        '25-26',
        '24-25',
      ]),
    [matchesQuery.data],
  );

  const {
    teamConfig,
    teamPlayers,
    isLoading: isSquadLoading,
    refetch: refetchSquad,
  } = useTeamSquad({
    teamId,
    season: selectedSeason,
  });

  const {
    players: masterPlayers,
    savePlayer,
    deletePlayer,
    savePhoto,
    deletePhoto,
    isLoading: isMasterLoading,
  } = useSeasonPlayers(selectedSeason, teamConfig.shortName);

  const mergedPlayers = useMemo(
    () => mergeMasterAndSquadPlayers(teamPlayers, masterPlayers),
    [teamPlayers, masterPlayers],
  );

  const viewData = useMemo(
    () => computeSquadViewData(mergedPlayers, idFilter),
    [mergedPlayers, idFilter],
  );

  const actions = useMemo(
    () =>
      createSquadActionHandlers({
        teamConfig,
        selectedSeason,
        teamPlayers,
        mergedPlayers,
        savePlayer,
        deletePlayer,
        savePhoto,
        deletePhoto,
        refetchSquad,
        setEditingPlayer,
        router,
      }),
    [
      teamConfig,
      selectedSeason,
      teamPlayers,
      mergedPlayers,
      savePlayer,
      deletePlayer,
      savePhoto,
      deletePhoto,
      refetchSquad,
      router,
    ],
  );

  return {
    teamConfig,
    selectedSeason,
    setSelectedSeason,
    availableSeasons,
    idFilter,
    setIdFilter,
    isLoading: isSquadLoading || isMasterLoading,
    mergedPlayers,
    ...viewData,
    isAddPlayerOpen,
    setIsAddPlayerOpen,
    isCopySeasonOpen,
    setIsCopySeasonOpen,
    editingPlayer,
    setEditingPlayer,
    ...actions,
    refetchSquad,
  };
}
