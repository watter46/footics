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

const COLOR_STYLES: Record<
  string,
  {
    iconBg: string;
    iconBorder: string;
    iconText: string;
    iconFill: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    selectHoverBorder: string;
    selectFocusRing: string;
    selectText: string;
    copyHoverBorder: string;
    copyHoverText: string;
    copyIconText: string;
    btnBg: string;
    btnHoverBg: string;
    btnShadow: string;
  }
> = {
  blue: {
    iconBg: 'bg-blue-600/20',
    iconBorder: 'border-blue-500/40',
    iconText: 'text-blue-400',
    iconFill: 'fill-blue-500/20',
    badgeBg: 'bg-blue-600/10',
    badgeBorder: 'border-blue-500/30',
    badgeText: 'text-blue-400',
    selectHoverBorder: 'hover:border-blue-500/60',
    selectFocusRing: 'focus:ring-blue-500/30',
    selectText: 'text-blue-400',
    copyHoverBorder: 'hover:border-blue-500/50',
    copyHoverText: 'hover:text-blue-300',
    copyIconText: 'text-blue-400',
    btnBg: 'bg-blue-600',
    btnHoverBg: 'hover:bg-blue-500',
    btnShadow: 'shadow-blue-600/25',
  },
  red: {
    iconBg: 'bg-red-600/20',
    iconBorder: 'border-red-500/40',
    iconText: 'text-red-400',
    iconFill: 'fill-red-500/20',
    badgeBg: 'bg-red-600/10',
    badgeBorder: 'border-red-500/30',
    badgeText: 'text-red-400',
    selectHoverBorder: 'hover:border-red-500/60',
    selectFocusRing: 'focus:ring-red-500/30',
    selectText: 'text-red-400',
    copyHoverBorder: 'hover:border-red-500/50',
    copyHoverText: 'hover:text-red-300',
    copyIconText: 'text-red-400',
    btnBg: 'bg-red-600',
    btnHoverBg: 'hover:bg-red-500',
    btnShadow: 'shadow-red-600/25',
  },
  sky: {
    iconBg: 'bg-sky-600/20',
    iconBorder: 'border-sky-500/40',
    iconText: 'text-sky-400',
    iconFill: 'fill-sky-500/20',
    badgeBg: 'bg-sky-600/10',
    badgeBorder: 'border-sky-500/30',
    badgeText: 'text-sky-400',
    selectHoverBorder: 'hover:border-sky-500/60',
    selectFocusRing: 'focus:ring-sky-500/30',
    selectText: 'text-sky-400',
    copyHoverBorder: 'hover:border-sky-500/50',
    copyHoverText: 'hover:text-sky-300',
    copyIconText: 'text-sky-400',
    btnBg: 'bg-sky-600',
    btnHoverBg: 'hover:bg-sky-500',
    btnShadow: 'shadow-sky-600/25',
  },
  amber: {
    iconBg: 'bg-amber-600/20',
    iconBorder: 'border-amber-500/40',
    iconText: 'text-amber-400',
    iconFill: 'fill-amber-500/20',
    badgeBg: 'bg-amber-600/10',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-400',
    selectHoverBorder: 'hover:border-amber-500/60',
    selectFocusRing: 'focus:ring-amber-500/30',
    selectText: 'text-amber-400',
    copyHoverBorder: 'hover:border-amber-500/50',
    copyHoverText: 'hover:text-amber-300',
    copyIconText: 'text-amber-400',
    btnBg: 'bg-amber-600',
    btnHoverBg: 'hover:bg-amber-500',
    btnShadow: 'shadow-amber-600/25',
  },
};

export const SquadHeader: React.FC<SquadHeaderProps> = ({
  teamName = 'Club',
  leagueName = 'League',
  accentColor = 'blue',
  selectedSeason,
  availableSeasons,
  onSelectSeason,
  onSyncSquad,
  onOpenCopySeason,
  onOpenTacticalBoard,
  onOpenTacticalCanvas,
  onOpenAddPlayer,
}) => {
  const styles = COLOR_STYLES[accentColor] || COLOR_STYLES.blue;

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-2xl ${styles.iconBg} border ${styles.iconBorder} flex items-center justify-center ${styles.iconText} shadow-inner`}
        >
          <Shield className={`w-8 h-8 ${styles.iconFill}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-100">
              {teamName}
            </h1>
            <Badge
              variant="outline"
              className={`${styles.badgeBg} border ${styles.badgeBorder} ${styles.badgeText} text-[10px] font-bold uppercase tracking-wider`}
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
            className={`h-10 bg-slate-950/80 border border-slate-700 ${styles.selectHoverBorder} rounded-xl px-4 text-xs font-bold ${styles.selectText} appearance-none cursor-pointer focus:outline-none focus:ring-2 ${styles.selectFocusRing} pr-9 transition-all shadow-sm`}
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

        {/* Sync from Presets / Matches Button */}
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
          className={`h-10 px-3.5 bg-slate-950/80 border-slate-700 ${styles.copyHoverBorder} hover:bg-slate-800 text-slate-300 ${styles.copyHoverText} rounded-xl text-xs font-semibold gap-2 transition-colors`}
        >
          <FolderSync className={`w-3.5 h-3.5 ${styles.copyIconText}`} />
          <span className="hidden sm:inline">他シーズンから引き継ぐ</span>
        </Button>

        {/* Open in Tactical Board (Unified Canvas) */}
        {(onOpenTacticalCanvas || onOpenTacticalBoard) && (
          <Button
            size="sm"
            onClick={onOpenTacticalCanvas || onOpenTacticalBoard}
            className="h-10 px-4 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 rounded-xl text-xs font-bold gap-2 transition-all shadow-sm group"
            title="現在のスカッドをTactical統合キャンバスに流し込んで開く"
          >
            <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Tactical Board</span>
          </Button>
        )}

        {/* Add New Player Button */}
        <Button
          size="sm"
          onClick={onOpenAddPlayer}
          className={`h-10 px-4 ${styles.btnBg} ${styles.btnHoverBg} text-white rounded-xl text-xs font-bold gap-2 shadow-lg ${styles.btnShadow} transition-all`}
        >
          <Plus className="w-4 h-4" />
          <span>Add Player</span>
        </Button>
      </div>
    </div>
  );
};
