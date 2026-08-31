'use client';

import {
  ChevronDown,
  ExternalLink,
  FolderSync,
  Plus,
  RefreshCw,
  Shield,
} from 'lucide-react';
import type React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface SquadHeaderProps {
  teamName?: string;
  leagueName?: string;
  selectedSeason: string;
  availableSeasons: string[];
  onSelectSeason: (season: string) => void;
  onSyncSquad: () => void;
  onOpenCopySeason: () => void;
  onOpenTacticalBoard: () => void;
  onOpenTacticalCanvas?: () => void;
  onOpenAddPlayer: () => void;
}

export const SquadHeader: React.FC<SquadHeaderProps> = ({
  teamName = 'Chelsea FC',
  leagueName = 'Premier League',
  selectedSeason,
  availableSeasons,
  onSelectSeason,
  onSyncSquad,
  onOpenCopySeason,
  onOpenTacticalBoard,
  onOpenTacticalCanvas,
  onOpenAddPlayer,
}) => {
  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
          <Shield className="w-8 h-8 fill-blue-500/20" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-100">
              {teamName}
            </h1>
            <Badge
              variant="outline"
              className="bg-blue-600/10 border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase tracking-wider"
            >
              {leagueName}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Squad Management & Tactical Preparation
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Season Selector */}
        <div className="relative">
          <select
            value={selectedSeason}
            onChange={(e) => onSelectSeason(e.target.value)}
            className="h-10 bg-slate-950/80 border border-slate-700 hover:border-blue-500/60 rounded-xl px-4 text-xs font-bold text-blue-400 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-9 transition-all shadow-sm"
            title="シーズン切り替え"
          >
            {availableSeasons.map((s) => (
              <option key={s} value={s} className="bg-slate-900 text-slate-200">
                Season {s}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sync from Presets Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onSyncSquad}
          title="プリセット・試合データから選手を再同期"
          className="h-10 px-3.5 bg-slate-950/80 border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Sync Squad</span>
        </Button>

        {/* Copy Season Players Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenCopySeason}
          title="他のシーズンから選手を引き継ぐ"
          className="h-10 px-3.5 bg-slate-950/80 border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 text-slate-300 hover:text-blue-300 rounded-xl text-xs font-semibold gap-2 transition-colors"
        >
          <FolderSync className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">他シーズンから引き継ぐ</span>
        </Button>

        {/* Open in Tactical Canvas Button */}
        {onOpenTacticalCanvas && (
          <Button
            size="sm"
            onClick={onOpenTacticalCanvas}
            className="h-10 px-3.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 rounded-xl text-xs font-bold gap-2 transition-all shadow-sm group"
            title="現在のスカッドをTactical統合キャンバスに流し込んで開く"
          >
            <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Open in Canvas</span>
          </Button>
        )}

        {/* Tactical Board Modal Button */}
        <Button
          size="sm"
          onClick={onOpenTacticalBoard}
          className="h-10 px-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 hover:border-blue-400 text-blue-300 rounded-xl text-xs font-bold gap-2 transition-all shadow-sm group"
        >
          <Shield className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          <span>Tactical Board</span>
        </Button>

        {/* Add New Player Button */}
        <Button
          size="sm"
          onClick={onOpenAddPlayer}
          className="h-10 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold gap-2 shadow-lg shadow-blue-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Player</span>
        </Button>
      </div>
    </div>
  );
};
