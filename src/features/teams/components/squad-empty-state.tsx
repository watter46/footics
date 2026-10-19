'use client';

import { FolderSync, Plus, RefreshCw, Users } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

export const SquadEmptyState: React.FC<SquadEmptyStateProps> = ({
  idFilter,
  selectedSeason,
  teamConfig,
  onSyncSquad,
  onOpenCopySeason,
  onOpenAddPlayer,
}) => {
  return (
    <Card className="bg-slate-900/30 border-slate-800/60 border-dashed rounded-2xl p-12 text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
        <Users className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-200">
          {idFilter === 'all'
            ? `No players found for Season ${selectedSeason}`
            : '該当する選手がいません'}
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          {idFilter === 'manual'
            ? 'このシーズンにはID未登録（手動）の選手はいません。すべての選手がWhoScored公式IDと紐付いています。'
            : idFilter === 'official'
              ? 'WhoScored登録済みの選手が見つかりませんでした。'
              : `Sync presets/matches or add new players to ${teamConfig.shortName}'s squad.`}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button
          onClick={onSyncSquad}
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Squad</span>
        </Button>
        <Button
          onClick={onOpenCopySeason}
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl text-xs border-blue-500/40 text-blue-400 hover:bg-blue-600/10"
        >
          <FolderSync className="w-3.5 h-3.5" />
          <span>他シーズンから引き継ぐ</span>
        </Button>
        <Button
          onClick={onOpenAddPlayer}
          size="sm"
          className="gap-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-500 text-white"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Player</span>
        </Button>
      </div>
    </Card>
  );
};
