import { toast } from 'sonner';
import type { PlayerMaster } from '@/lib/db/schema';
import {
  CHELSEA_PRESETS_BY_SEASON,
  type Season,
} from '@/lib/tactical/chelsea-preset';
import { injectTeamSquadToTactical } from '@/lib/tactical/squad-to-tactical-bridge';
import type { SupportedTeam } from '@/lib/tactical/teams-config';
import type { Player } from '@/types';
import type { EditablePlayerData } from '../components/EditPlayerDialog';
import type { MergedSquadPlayer } from '../components/squad-player-card';

/**
 * チームスカッドを選手マスタに一括同期
 */
export async function syncSquadToMaster(params: {
  teamConfig: SupportedTeam;
  selectedSeason: string;
  teamPlayers: Player[];
  savePlayer: (
    player: Partial<PlayerMaster> & { playerId: number; name: string },
  ) => Promise<void>;
}): Promise<void> {
  const { teamConfig, selectedSeason, teamPlayers, savePlayer } = params;
  if (teamConfig.id === 'chelsea') {
    const presetSquad =
      CHELSEA_PRESETS_BY_SEASON[selectedSeason as Season] || [];
    for (const p of presetSquad) {
      await savePlayer({
        playerId: p.playerId,
        name: p.name,
        defaultShirtNo: p.shirtNo,
        position: p.position,
        season: selectedSeason,
        teamName: teamConfig.shortName,
      });
    }
  } else {
    for (const p of teamPlayers) {
      await savePlayer({
        playerId: p.playerId,
        name: p.name,
        defaultShirtNo: p.shirtNo,
        position: p.position,
        season: selectedSeason,
        teamName: teamConfig.shortName,
      });
    }
  }
}

export interface CreateSquadActionHandlersParams {
  teamConfig: SupportedTeam;
  selectedSeason: string;
  teamPlayers: Player[];
  mergedPlayers: MergedSquadPlayer[];
  savePlayer: (
    player: Partial<PlayerMaster> & { playerId: number; name: string },
  ) => Promise<void>;
  deletePlayer: (playerId: number) => Promise<void>;
  savePhoto: (params: {
    playerId: number;
    blob: Blob;
    name?: string;
  }) => Promise<void>;
  deletePhoto: (playerId: number) => Promise<void>;
  refetchSquad: () => void;
  setEditingPlayer: (player: EditablePlayerData | null) => void;
  router: { push: (url: string) => void };
}

export function createSquadActionHandlers(
  params: CreateSquadActionHandlersParams,
) {
  const {
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
  } = params;

  const handleSyncSquad = async () => {
    const toastId = toast.loading(
      `${teamConfig.shortName} (${selectedSeason}) の選手データを同期中...`,
    );
    try {
      await syncSquadToMaster({
        teamConfig,
        selectedSeason,
        teamPlayers,
        savePlayer,
      });
      refetchSquad();
      toast.success(
        `${teamConfig.shortName} (${selectedSeason}) の選手データを同期しました`,
        { id: toastId },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '同期に失敗しました';
      toast.error(msg, { id: toastId });
    }
  };

  const handleDeletePlayer = async (player: MergedSquadPlayer) => {
    if (!confirm(`${player.name} を選手リストから削除しますか？`)) {
      return;
    }
    try {
      await deletePlayer(player.playerId);
      refetchSquad();
      toast.success(`${player.name} を削除しました`);
    } catch {
      toast.error('選手の削除に失敗しました');
    }
  };

  const handleEditPlayer = (player: MergedSquadPlayer) => {
    setEditingPlayer({
      playerId: player.playerId,
      name: player.name,
      shirtNo: player.shirtNo,
      position: player.position,
      season: selectedSeason,
      teamName: teamConfig.shortName,
    });
  };

  const handleOpenTacticalCanvas = () => {
    injectTeamSquadToTactical({
      teamName: teamConfig.name,
      team: 'home',
      players: mergedPlayers,
      formation: '4-2-3-1',
      mode: 'half',
    });
    toast.success(
      `${teamConfig.shortName} のスカッドを Tactical Canvas に読み込みました`,
    );
    router.push('/tactical');
  };

  const handlePhotoUpload = async (
    playerId: number,
    blob: Blob,
    name: string,
  ) => {
    await savePhoto({ playerId, blob, name });
    refetchSquad();
  };

  const handlePhotoDelete = async (playerId: number) => {
    await deletePhoto(playerId);
    refetchSquad();
  };

  return {
    handleSyncSquad,
    handleDeletePlayer,
    handleEditPlayer,
    handleOpenTacticalCanvas,
    handlePhotoUpload,
    handlePhotoDelete,
  };
}
