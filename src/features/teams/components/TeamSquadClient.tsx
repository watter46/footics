'use client';

import { Loader2 } from 'lucide-react';
import type React from 'react';
import { useTeamSquadClient } from '../hooks/use-team-squad-client';
import { POSITION_CATEGORIES } from '../utils/squad-aggregation';
import { SquadCategoryList } from './squad-category-list';
import { SquadDialogs } from './squad-dialogs';
import { SquadEmptyState } from './squad-empty-state';
import { SquadFilterBar } from './squad-filter-bar';
import { SquadHeader } from './squad-header';
import { SquadStatsSummary } from './squad-stats-summary';

export interface TeamSquadClientProps {
  teamId?: string;
  initialSeason?: string;
}

export const TeamSquadClient: React.FC<TeamSquadClientProps> = ({
  teamId = 'chelsea',
  initialSeason,
}) => {
  const squad = useTeamSquadClient({ teamId, initialSeason });

  return (
    <div className="space-y-8">
      {/* Team Header & Control Bar */}
      <SquadHeader
        teamName={squad.teamConfig.name}
        leagueName={squad.teamConfig.league}
        accentColor={squad.teamConfig.accentColor}
        selectedSeason={squad.selectedSeason}
        availableSeasons={squad.availableSeasons}
        onSelectSeason={squad.setSelectedSeason}
        onSyncSquad={squad.handleSyncSquad}
        onOpenCopySeason={() => squad.setIsCopySeasonOpen(true)}
        onOpenTacticalCanvas={squad.handleOpenTacticalCanvas}
        onOpenAddPlayer={() => squad.setIsAddPlayerOpen(true)}
      />

      {/* Summary Stat Cards */}
      <SquadStatsSummary
        totalCount={squad.mergedPlayers.length}
        positionCategories={POSITION_CATEGORIES}
        playersByCategory={squad.playersByCategory}
      />

      {/* ID Status Filter Bar */}
      <SquadFilterBar
        idFilter={squad.idFilter}
        onFilterChange={squad.setIdFilter}
        totalCount={squad.mergedPlayers.length}
        officialCount={squad.officialCount}
        manualCount={squad.manualCount}
      />

      {/* Players Categories & Cards Grid */}
      {squad.isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-sm font-medium">
            Loading {squad.teamConfig.shortName} squad...
          </span>
        </div>
      ) : squad.filteredPlayers.length === 0 ? (
        <SquadEmptyState
          idFilter={squad.idFilter}
          selectedSeason={squad.selectedSeason}
          teamConfig={squad.teamConfig}
          onSyncSquad={squad.handleSyncSquad}
          onOpenCopySeason={() => squad.setIsCopySeasonOpen(true)}
          onOpenAddPlayer={() => squad.setIsAddPlayerOpen(true)}
        />
      ) : (
        <SquadCategoryList
          positionCategories={POSITION_CATEGORIES}
          playersByCategory={squad.playersByCategory}
          selectedSeason={squad.selectedSeason}
          onEdit={squad.handleEditPlayer}
          onDelete={squad.handleDeletePlayer}
          onPhotoUpload={squad.handlePhotoUpload}
          onPhotoDelete={squad.handlePhotoDelete}
        />
      )}

      {/* Dialogs */}
      <SquadDialogs
        teamConfig={squad.teamConfig}
        selectedSeason={squad.selectedSeason}
        availableSeasons={squad.availableSeasons}
        isAddPlayerOpen={squad.isAddPlayerOpen}
        onCloseAddPlayer={() => squad.setIsAddPlayerOpen(false)}
        isCopySeasonOpen={squad.isCopySeasonOpen}
        onCloseCopySeason={() => squad.setIsCopySeasonOpen(false)}
        editingPlayer={squad.editingPlayer}
        onCloseEditPlayer={() => squad.setEditingPlayer(null)}
        availableOfficialPlayers={squad.availableOfficialPlayers}
        currentSeasonPlayerIds={squad.currentSeasonPlayerIds}
        refetchSquad={squad.refetchSquad}
      />
    </div>
  );
};
