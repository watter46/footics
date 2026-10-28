'use client';

import { Calendar } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { Match } from '@/types';

interface MatchCardProps {
  match: Match;
  isLatest?: boolean;
  isImported?: boolean;
}

export function MatchCard({ match }: MatchCardProps) {
  return (
    <Link href={`/match/${match.id}`} className="block w-full">
      <Card
        interactive
        className="relative overflow-hidden group w-full p-0 flex flex-row border-white/[0.07] bg-[#18181B] hover:bg-[#1e1e22] transition-colors"
      >
        {/* Date column */}
        <div className="px-2.5 py-2.5 sm:px-5 sm:py-4 w-20 sm:w-36 border-r border-white/[0.07] flex flex-col justify-center items-start gap-1 sm:gap-1.5 bg-black/20 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-medium text-[#A1A1AA]">
            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#FF8A00] shrink-0" />
            <span>
              {match.date
                ? new Date(match.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : '—'}
            </span>
          </div>
          <div className="text-[9px] sm:text-[10px] text-[#71717A] font-mono">
            {match.date ? new Date(match.date).getFullYear() : 'N/A'}
          </div>
          <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.07] text-[#71717A] font-mono mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis w-full max-w-full block">
            #{match.id}
          </span>
          {match.matchType === 'national' && (
            <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded bg-[#00A8FF]/10 border border-[#00A8FF]/30 text-[#00A8FF] font-bold mt-0.5 uppercase tracking-wider truncate w-full">
              National
            </span>
          )}
        </div>

        {/* Match content */}
        <div className="p-2 sm:p-4 flex-1 flex justify-between items-center gap-1.5 sm:gap-4 min-w-0">
          {/* Home Team */}
          <div className="flex items-center gap-1.5 sm:gap-3 w-[38%] justify-end text-right min-w-0">
            <span className="font-bold text-[11px] sm:text-base leading-tight line-clamp-2 sm:line-clamp-1 text-[#F4F4F5] break-words">
              {match.homeTeam.name}
            </span>
            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-md sm:rounded-lg bg-white/[0.05] flex items-center justify-center p-1 sm:p-1.5 shadow-inner transform group-hover:scale-105 transition-transform duration-200 shrink-0 border border-white/[0.08]">
              <img
                src={`https://d2zywfiolv4f83.cloudfront.net/img/teams/${match.homeTeam.id}.png`}
                alt={match.homeTeam.name}
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center justify-center shrink-0 z-10 px-1">
            <div className="text-base sm:text-3xl font-black tracking-tight text-[#F4F4F5] whitespace-nowrap font-mono tabular-nums drop-shadow-sm">
              {(match.score || '0 : 0').replace(/\s+/g, '').replace(':', ' - ')}
            </div>
            <div className="mt-1">
              <Badge
                variant="secondary"
                className="text-[9px] uppercase tracking-wider font-semibold text-[#A1A1AA] border-white/[0.07] px-1.5 py-0 h-4"
              >
                Full Time
              </Badge>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-1.5 sm:gap-3 w-[38%] justify-start text-left min-w-0">
            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-md sm:rounded-lg bg-white/[0.05] flex items-center justify-center p-1 sm:p-1.5 shadow-inner transform group-hover:scale-105 transition-transform duration-200 shrink-0 border border-white/[0.08]">
              <img
                src={`https://d2zywfiolv4f83.cloudfront.net/img/teams/${match.awayTeam.id}.png`}
                alt={match.awayTeam.name}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-[11px] sm:text-base leading-tight line-clamp-2 sm:line-clamp-1 text-[#D4D4D8] group-hover:text-white transition-colors break-words">
              {match.awayTeam.name}
            </span>
          </div>
        </div>

        {/* Hover accent */}
        <div className="absolute inset-y-0 left-0 w-0.5 bg-[#FF8100]/0 group-hover:bg-[#FF8100] transition-colors duration-200 rounded-l-[10px]" />
      </Card>
    </Link>
  );
}
