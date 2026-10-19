import type { SupportedTeam } from '@/lib/tactical/teams-config';
import type { StandardPosition } from '@/types';
import type { EditablePlayerData } from '../components/EditPlayerDialog';
import type { IdFilterType } from '../components/squad-filter-bar';
import type { MergedSquadPlayer } from '../components/squad-player-card';

export type IdFilterOption = IdFilterType;

export interface OfficialPlayerOption {
  playerId: number;
  name: string;
  shirtNo?: number;
}

export interface UseTeamSquadClientProps {
  teamId?: string;
  initialSeason?: string;
}

export interface UseTeamSquadClientResult {
  teamConfig: SupportedTeam;
  selectedSeason: string;
  setSelectedSeason: (season: string) => void;
  availableSeasons: string[];
  idFilter: IdFilterOption;
  setIdFilter: (filter: IdFilterOption) => void;
  isLoading: boolean;
  mergedPlayers: MergedSquadPlayer[];
  filteredPlayers: MergedSquadPlayer[];
  playersByCategory: Record<StandardPosition | string, MergedSquadPlayer[]>;
  officialCount: number;
  manualCount: number;
  isAddPlayerOpen: boolean;
  setIsAddPlayerOpen: (open: boolean) => void;
  isCopySeasonOpen: boolean;
  setIsCopySeasonOpen: (open: boolean) => void;
  editingPlayer: EditablePlayerData | null;
  setEditingPlayer: (player: EditablePlayerData | null) => void;
  availableOfficialPlayers: OfficialPlayerOption[];
  currentSeasonPlayerIds: Set<number>;
  handleSyncSquad: () => Promise<void>;
  handleDeletePlayer: (player: MergedSquadPlayer) => Promise<void>;
  handleEditPlayer: (player: MergedSquadPlayer) => void;
  handleOpenTacticalCanvas: () => void;
  handlePhotoUpload: (
    playerId: number,
    blob: Blob,
    name: string,
  ) => Promise<void>;
  handlePhotoDelete: (playerId: number) => Promise<void>;
  refetchSquad: () => void;
}
