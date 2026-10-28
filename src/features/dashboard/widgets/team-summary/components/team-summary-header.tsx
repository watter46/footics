'use client';

import {
  ChevronLeft,
  ExternalLink,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { TeamSummaryHeaderProps } from '../types';

export function TeamSummaryHeader({
  metadata,
  activeFilterCount,
  onOpenSidebar,
  onAddEvent,
  actionSlot,
}: TeamSummaryHeaderProps) {
  const tacticalUrl = metadata.id
    ? `/tactical?matchId=${encodeURIComponent(String(metadata.id))}`
    : '/tactical';

  return (
    <div className="flex justify-between items-center mb-4 sm:mb-6 pl-0 sm:pl-2 pb-3 sm:pb-4 border-b border-white/[0.07] z-10 shrink-0 gap-2">
      <div className="flex items-center gap-1.5 sm:gap-4 min-w-0">
        <Link
          href="/"
          className="inline-flex items-center justify-center size-8 rounded-[8px] text-[#A1A1AA] hover:text-white hover:bg-white/[0.05] transition-colors shrink-0"
          title="Back to Match List"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-4 text-[#EDEDED] min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <img
              src={`https://d2zywfiolv4f83.cloudfront.net/img/teams/${metadata.teams.home.teamId}.png`}
              alt={metadata.teams.home.name}
              className="size-5 sm:size-7 object-contain shrink-0"
            />
            <span className="font-bold text-xs sm:text-lg truncate max-w-[70px] sm:max-w-none text-white">
              {metadata.teams.home.name}
            </span>
          </div>
          <div className="px-2 py-0.5 sm:px-3 sm:py-1 bg-[#18181B] border border-white/[0.07] rounded-md font-mono text-xs sm:text-sm font-bold text-white shadow-inner shrink-0">
            {metadata.score}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="font-bold text-xs sm:text-lg text-[#A1A1AA] truncate max-w-[70px] sm:max-w-none">
              {metadata.teams.away.name}
            </span>
            <img
              src={`https://d2zywfiolv4f83.cloudfront.net/img/teams/${metadata.teams.away.teamId}.png`}
              alt={metadata.teams.away.name}
              className="size-5 sm:size-7 object-contain shrink-0"
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Mobile Filter Button */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onOpenSidebar}
          className="lg:hidden relative"
          aria-label="Open Filters"
        >
          <SlidersHorizontal className="size-3.5 text-blue-400" />
          <span className="hidden xs:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center size-4 rounded-full bg-blue-500 text-[10px] text-white font-bold ml-0.5">
              {activeFilterCount}
            </span>
          )}
        </Button>

        <Link
          href={tacticalUrl}
          className="inline-flex items-center justify-center whitespace-nowrap outline-none select-none cursor-pointer h-7 px-2.5 text-xs font-medium rounded-[8px] gap-1.5 [&_svg]:size-3.5 btn-guideline-secondary btn-interactive active:scale-[0.98]"
          title="Tactical 戦術ボードを開く"
        >
          <ExternalLink className="size-3.5 shrink-0" />
          <span className="hidden md:inline">戦術ボード</span>
        </Link>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onAddEvent}
          title="Add Event"
          aria-label="Add Event"
          icon={<Plus className="size-3.5 shrink-0" />}
        >
          <span className="hidden sm:inline">Add Event</span>
        </Button>
        {actionSlot}
      </div>
    </div>
  );
}
