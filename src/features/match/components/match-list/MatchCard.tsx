'use client';

import { Calendar, Database } from 'lucide-react';
import Link from 'next/link';
import type { Match } from '@/types';

interface MatchCardProps {
  match: Match;
  isLatest?: boolean;
  isImported?: boolean;
}

export function MatchCard({ match, isLatest, isImported }: MatchCardProps) {
  return (
    <Link href={`/match/${match.id}`}>
      <div
        className={`relative bg-slate-900 border hover:bg-slate-800/80 transition-all duration-200 overflow-hidden group cursor-pointer w-full rounded-xl shadow hover:shadow-blue-900/10 flex flex-row ${
          isLatest
            ? 'border-blue-500/40 shadow-blue-900/20'
            : 'border-slate-800 hover:border-blue-500/30'
        }`}
      >
        {isLatest && (
          <span className="absolute top-2.5 left-3 text-[10px] font-bold uppercase tracking-widest text-blue-400/80 z-10">
            Latest
          </span>
        )}

        {/* Date column */}
        <div className="px-2.5 py-2.5 sm:px-5 sm:py-4 w-20 sm:w-36 border-r border-slate-800 flex flex-col justify-center items-start gap-1 sm:gap-1.5 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-medium text-slate-500">
            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400/70 shrink-0" />
            <span>
              {match.date
                ? new Date(match.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : '—'}
            </span>
          </div>
          <div className="text-[9px] sm:text-[10px] text-slate-600 font-mono">
            {match.date ? new Date(match.date).getFullYear() : 'N/A'}
          </div>
          <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-500 font-mono mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis w-full max-w-full block">
            #{match.id}
          </span>
          {isImported && (
            <span className="flex items-center gap-1 text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded bg-blue-900/40 border border-blue-500/40 text-blue-400 font-bold mt-0.5 uppercase tracking-wider">
              <Database className="w-2 sm:w-2.5 h-2 sm:h-2.5 shrink-0" />
              <span className="truncate">Imported</span>
            </span>
          )}
          {match.matchType === 'national' && (
            <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded bg-emerald-900/40 border border-emerald-500/40 text-emerald-400 font-bold mt-0.5 uppercase tracking-wider truncate w-full">
              National
            </span>
          )}
        </div>

        {/* Match content */}
        <div className="p-2 sm:p-4 flex-1 flex justify-between items-center gap-1.5 sm:gap-4 min-w-0">
          {/* Home Team */}
          <div className="flex items-center gap-1.5 sm:gap-3 w-[38%] justify-end text-right min-w-0">
            <span className="font-bold text-[11px] sm:text-base leading-tight line-clamp-2 sm:line-clamp-1 text-slate-100 break-words">
              {match.homeTeam.name}
            </span>
            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-md sm:rounded-lg bg-slate-100 flex items-center justify-center p-1 sm:p-1.5 shadow-inner transform group-hover:scale-105 transition-transform duration-200 shrink-0 border border-slate-200">
              <img
                src={`https://d2zywfiolv4f83.cloudfront.net/img/teams/${match.homeTeam.id}.png`}
                alt={match.homeTeam.name}
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center justify-center shrink-0 z-10 px-1">
            <div className="text-base sm:text-3xl font-black tracking-tighter text-slate-50 whitespace-nowrap tabular-nums drop-shadow-sm">
              {(match.score || '0 : 0').replace(/\s+/g, '').replace(':', ' - ')}
            </div>
            <div className="text-[8px] sm:text-[10px] text-slate-600 mt-0.5 uppercase tracking-widest font-black opacity-60">
              Full Time
            </div>
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-1.5 sm:gap-3 w-[38%] justify-start text-left min-w-0">
            <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-md sm:rounded-lg bg-slate-100 flex items-center justify-center p-1 sm:p-1.5 shadow-inner transform group-hover:scale-105 transition-transform duration-200 shrink-0 border border-slate-200">
              <img
                src={`https://d2zywfiolv4f83.cloudfront.net/img/teams/${match.awayTeam.id}.png`}
                alt={match.awayTeam.name}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-[11px] sm:text-base leading-tight line-clamp-2 sm:line-clamp-1 text-slate-300 group-hover:text-slate-200 transition-colors break-words">
              {match.awayTeam.name}
            </span>
          </div>
        </div>

        {/* Hover accent */}
        <div className="absolute inset-y-0 left-0 w-0.5 bg-blue-500/0 group-hover:bg-blue-500/80 transition-all duration-200 rounded-l-xl" />
      </div>
    </Link>
  );
}
