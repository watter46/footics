'use client';

import {
  ChevronLeft,
  ExternalLink,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { DataManagementMenu } from '@/features/management';
import type { TeamSummaryHeaderProps } from '../types';

export function TeamSummaryHeader({
  metadata,
  activeFilterCount,
  matchId,
  onOpenSidebar,
  onAddEvent,
  onRefreshCustomEvents,
}: TeamSummaryHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-4 sm:mb-6 pl-0 sm:pl-2 pb-3 sm:pb-4 border-b border-slate-800/60 z-10 shrink-0 gap-2">
      <div className="flex items-center gap-1.5 sm:gap-4 min-w-0">
        <Link
          href="/"
          className="p-1.5 sm:p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors shrink-0"
          title="Back to Match List"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-4 text-slate-200 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <img
              src={
                'https://d2zywfiolv4f83.cloudfront.net/img/teams/' +
                metadata.teams.home.teamId +
                '.png'
              }
              alt={metadata.teams.home.name}
              className="w-5 h-5 sm:w-7 sm:h-7 object-contain shrink-0"
            />
            <span className="font-bold text-xs sm:text-lg truncate max-w-[70px] sm:max-w-none">
              {metadata.teams.home.name}
            </span>
          </div>
          <div className="px-2 py-0.5 sm:px-3 sm:py-1 bg-slate-800/80 rounded-md font-mono text-xs sm:text-sm font-bold shadow-inner shrink-0">
            {metadata.score}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="font-bold text-xs sm:text-lg text-slate-300 truncate max-w-[70px] sm:max-w-none">
              {metadata.teams.away.name}
            </span>
            <img
              src={
                'https://d2zywfiolv4f83.cloudfront.net/img/teams/' +
                metadata.teams.away.teamId +
                '.png'
              }
              alt={metadata.teams.away.name}
              className="w-5 h-5 sm:w-7 sm:h-7 object-contain shrink-0"
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Mobile Filter Button */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="lg:hidden relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 rounded-lg text-xs font-bold transition-all"
          aria-label="Open Filters"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden xs:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-[10px] text-white font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        <Link
          href="/tactical"
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-900/20"
          title="Tactical 戦術ボードを開く"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">戦術ボード</span>
        </Link>
        <button
          type="button"
          onClick={onAddEvent}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-amber-900/20"
          title="Add Event"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Add Event</span>
        </button>
        <DataManagementMenu
          matchId={matchId}
          onRefresh={onRefreshCustomEvents}
        />
      </div>
    </div>
  );
}
