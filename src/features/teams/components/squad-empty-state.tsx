'use client';

import { FolderSync, Plus, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/patterns/empty-state';
import type { SupportedTeam } from '@/lib/tactical/teams-config';
import type { IdFilterOption } from '../types/squad-client';

export interface SquadEmptyStateProps {
  idFilter: IdFilterOption;
  selectedSeason: string;
  teamConfig: SupportedTeam;
  onSyncSquad: () => Promise<void>;
  onOpenCopySeason: () => void;
  onOpenAddPlayer: () => void;
}

export function SquadEmptyState({
  idFilter,
  selectedSeason,
  teamConfig,
  onSyncSquad,
  onOpenCopySeason,
  onOpenAddPlayer,
}: SquadEmptyStateProps) {
  const title =
    idFilter === 'all'
      ? `No players found for Season ${selectedSeason}`
      : '該当する選手がいません';

  const description =
    idFilter === 'manual'
      ? 'このシーズンにはID未登録（手動）の選手はいません。すべての選手がWhoScored公式IDと紐付いています。'
      : idFilter === 'official'
        ? 'WhoScored登録済みの選手が見つかりませんでした。'
        : `Sync presets/matches or add new players to ${teamConfig.shortName}'s squad.`;

  return (
    <EmptyState
      icon={<Users className="size-6 text-white/40" />}
      title={title}
      description={description}
      action={
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={onSyncSquad}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="size-3.5" />
            <span>Sync Squad</span>
          </Button>
          <Button
            onClick={onOpenCopySeason}
            variant="outline"
            size="sm"
            className="gap-2 border-[#FF8100]/40 text-[#FFA336] hover:bg-[#FF8100]/10"
          >
            <FolderSync className="size-3.5" />
            <span>他シーズンから引き継ぐ</span>
          </Button>
          <Button
            onClick={onOpenAddPlayer}
            variant="primary"
            size="sm"
            className="gap-2"
          >
            <Plus className="size-3.5" />
            <span>Add Player</span>
          </Button>
        </div>
      }
    />
  );
}
