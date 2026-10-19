'use client';

import type React from 'react';
import type { SupportedTeam } from '@/lib/tactical/teams-config';
import type { OfficialPlayerOption } from '../types/squad-client';
import { AddPlayerDialog } from './AddPlayerDialog';
import { CopySeasonPlayersDialog } from './CopySeasonPlayersDialog';
import { type EditablePlayerData, EditPlayerDialog } from './EditPlayerDialog';

export interface SquadDialogsProps {
  teamConfig: SupportedTeam;
  selectedSeason: string;
  availableSeasons: string[];
  isAddPlayerOpen: boolean;
  onCloseAddPlayer: () => void;
  isCopySeasonOpen: boolean;
  onCloseCopySeason: () => void;
  editingPlayer: EditablePlayerData | null;
  onCloseEditPlayer: () => void;
  availableOfficialPlayers: OfficialPlayerOption[];
  currentSeasonPlayerIds: Set<number>;
  refetchSquad: () => void;
}

export const SquadDialogs: React.FC<SquadDialogsProps> = ({
  teamConfig,
  selectedSeason,
  availableSeasons,
  isAddPlayerOpen,
  onCloseAddPlayer,
  isCopySeasonOpen,
  onCloseCopySeason,
  editingPlayer,
  onCloseEditPlayer,
  availableOfficialPlayers,
  currentSeasonPlayerIds,
  refetchSquad,
}) => {
  return (
    <>
      {/* Add Player Dialog */}
      <AddPlayerDialog
        isOpen={isAddPlayerOpen}
        onClose={onCloseAddPlayer}
        defaultTeam="home"
        defaultSeason={selectedSeason}
        teamName={teamConfig.shortName}
        availableSeasons={availableSeasons}
        onPlayerAdded={refetchSquad}
      />

      {/* Edit Player Dialog */}
      <EditPlayerDialog
        isOpen={Boolean(editingPlayer)}
        onClose={onCloseEditPlayer}
        player={editingPlayer}
        availableOfficialPlayers={availableOfficialPlayers}
        onSuccess={refetchSquad}
      />

      {/* Copy Season Players Dialog */}
      <CopySeasonPlayersDialog
        isOpen={isCopySeasonOpen}
        onClose={onCloseCopySeason}
        teamId={teamConfig.id}
        teamName={teamConfig.shortName}
        targetSeason={selectedSeason}
        availableSeasons={availableSeasons}
        currentSeasonPlayerIds={currentSeasonPlayerIds}
        onSuccess={refetchSquad}
      />
    </>
  );
};
