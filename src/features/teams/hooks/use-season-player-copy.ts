import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { savePlayerMaster } from '@/lib/db/queries';
import { normalizePosition } from '@/lib/tactical/player-formatting';
import type { StandardPosition } from '@/types';
import { useSeasonPlayers } from './use-player-master';
import { useTeamSquad } from './use-team-squad';

export interface MergedSourcePlayer {
  playerId: number;
  name: string;
  shirtNo: number;
  position: StandardPosition;
  photoBlob?: Blob;
  photoUrl?: string;
  isAlreadyInTarget: boolean;
}

export interface UseSeasonPlayerCopyParams {
  teamId?: string;
  teamName?: string;
  targetSeason: string;
  availableSeasons: string[];
  currentSeasonPlayerIds: Set<number>;
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

async function copyPlayer(p: MergedSourcePlayer, season: string, team: string) {
  const { playerId, name, shirtNo: defaultShirtNo, position, photoBlob } = p;
  await savePlayerMaster({
    playerId,
    name,
    defaultShirtNo,
    position,
    season,
    teamName: team,
    photoBlob,
    updatedAt: Date.now(),
  });
}

export function useSeasonPlayerCopy(params: UseSeasonPlayerCopyParams) {
  const teamId = params.teamId ?? 'chelsea';
  const teamName = params.teamName ?? 'Chelsea';
  const { targetSeason, availableSeasons } = params;
  const otherSeasons = useMemo(
    () => availableSeasons.filter((s) => s !== targetSeason),
    [availableSeasons, targetSeason],
  );
  const [fromSeason, setFromSeason] = useState(otherSeasons[0] || '25-26');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(new Set<number>());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { teamPlayers: sourceSquad, isLoading: isSquadLoading } = useTeamSquad({
    teamId,
    teamName,
    season: fromSeason,
  });
  const { players: sourceMasters, isLoading: isMasterLoading } =
    useSeasonPlayers(fromSeason, teamName);

  const mergedSourcePlayers = useMemo(() => {
    const map = new Map(sourceMasters.map((m) => [m.playerId, m]));
    return sourceSquad
      .map((p) => {
        const m = map.get(p.playerId);
        return {
          playerId: p.playerId,
          name: m?.name ?? p.name,
          shirtNo: m?.defaultShirtNo ?? p.shirtNo,
          position: normalizePosition(m?.position ?? p.position),
          photoBlob: m?.photoBlob,
          photoUrl: m?.photoUrl,
          isAlreadyInTarget: params.currentSeasonPlayerIds.has(p.playerId),
        };
      })
      .sort((a, b) => (a.shirtNo || 99) - (b.shirtNo || 99));
  }, [sourceSquad, sourceMasters, params.currentSeasonPlayerIds]);

  const unregisteredIds = useMemo(() => {
    const ids = new Set<number>();
    for (const p of mergedSourcePlayers) {
      if (!p.isAlreadyInTarget) ids.add(p.playerId);
    }
    return ids;
  }, [mergedSourcePlayers]);

  useEffect(() => {
    if (params.isOpen && mergedSourcePlayers.length > 0) {
      setSelectedPlayerIds(unregisteredIds);
    }
  }, [params.isOpen, mergedSourcePlayers, unregisteredIds]);

  const toggleSelectPlayer = (id: number) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      return next.delete(id) ? next : next.add(id);
    });
  };
  const handleSelectAllUnregistered = () =>
    setSelectedPlayerIds(unregisteredIds);
  const handleSelectAll = () =>
    setSelectedPlayerIds(new Set(mergedSourcePlayers.map((p) => p.playerId)));
  const handleClearAll = () => setSelectedPlayerIds(new Set());

  const handleExecuteCopy = async () => {
    if (selectedPlayerIds.size === 0) {
      toast.error('引き継ぐ選手を選択してください');
      return;
    }
    const selected = mergedSourcePlayers.filter((p) =>
      selectedPlayerIds.has(p.playerId),
    );
    setIsSubmitting(true);
    const msg = `${selected.length} 名の選手を Season ${targetSeason} に引き継ぎ`;
    const toastId = toast.loading(`${msg}中...`);
    try {
      for (const p of selected) await copyPlayer(p, targetSeason, teamName);
      toast.success(`${msg}ました！`, { id: toastId });
      params.onSuccess();
      params.onClose();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : '引き継ぎに失敗しました',
        { id: toastId },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    fromSeason,
    setFromSeason,
    otherSeasons,
    mergedSourcePlayers,
    selectedPlayerIds,
    toggleSelectPlayer,
    handleSelectAllUnregistered,
    handleSelectAll,
    handleClearAll,
    handleExecuteCopy,
    isLoading: isSquadLoading || isMasterLoading,
    isSubmitting,
  };
}
