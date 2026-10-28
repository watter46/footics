'use client';

import {
  ExternalLink,
  FolderSync,
  Plus,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NativeSelect } from '@/components/ui/select';

export interface SquadHeaderProps {
  teamName?: string;
  leagueName?: string;
  accentColor?: string;
  selectedSeason: string;
  availableSeasons: string[];
  onSelectSeason: (season: string) => void;
  onSyncSquad: () => void;
  onOpenCopySeason: () => void;
  onOpenTacticalBoard?: () => void;
  onOpenTacticalCanvas?: () => void;
  onOpenAddPlayer: () => void;
}

export function SquadHeader({
  teamName = 'Club',
  leagueName = 'League',
  accentColor: _accentColor = 'blue',
  selectedSeason,
  availableSeasons,
  onSelectSeason,
  onSyncSquad,
  onOpenCopySeason,
  onOpenTacticalBoard,
  onOpenTacticalCanvas,
  onOpenAddPlayer,
}: SquadHeaderProps) {
  return (
    <Card className="bg-surface-l2 border-white/[0.08] p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center text-accent-orange shrink-0">
          <Shield className="size-7" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">
              {teamName}
            </h1>
            <Badge
              variant="outline"
              className="bg-white/[0.04] border-white/[0.08] text-white/80 text-[10px] font-bold uppercase tracking-wider"
            >
              {leagueName}
            </Badge>
          </div>
          <p className="text-xs text-white/60 font-medium mt-0.5">
            Squad Management & Tactical Preparation
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Season Selector */}
        <div className="w-36">
          <NativeSelect
            value={selectedSeason}
            onChange={(e) => onSelectSeason(e.target.value)}
            title="シーズン切り替え"
          >
            {availableSeasons.map((s) => (
              <option key={s} value={s}>
                Season {s}
              </option>
            ))}
          </NativeSelect>
        </div>

        {/* Sync from Presets / Matches Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onSyncSquad}
          title="プリセット・試合データから選手を再同期"
          className="gap-2"
        >
          <RefreshCw className="size-3.5 text-white/60" />
          <span className="hidden sm:inline">Sync Squad</span>
        </Button>

        {/* Copy Season Players Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenCopySeason}
          title="他のシーズンから選手を引き継ぐ"
          className="gap-2 border-accent-orange/40 text-accent-orange hover:bg-accent-orange/10"
        >
          <FolderSync className="size-3.5" />
          <span className="hidden sm:inline">他シーズンから引き継ぐ</span>
        </Button>

        {/* Open in Tactical Board (Unified Canvas) */}
        {(onOpenTacticalCanvas || onOpenTacticalBoard) && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenTacticalCanvas || onOpenTacticalBoard}
            title="現在のスカッドをTactical統合キャンバスに流し込んで開く"
            className="gap-2"
          >
            <ExternalLink className="size-3.5" />
            <span>Tactical Board</span>
          </Button>
        )}

        {/* Add New Player Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenAddPlayer}
          className="gap-2"
        >
          <Plus className="size-3.5" />
          <span>Add Player</span>
        </Button>
      </div>
    </Card>
  );
}
