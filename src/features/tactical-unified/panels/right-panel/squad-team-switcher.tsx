'use client';

import type React from 'react';

export interface SquadTeamSwitcherProps {
  activeTeam: 'home' | 'away';
  setActiveTeam: (team: 'home' | 'away') => void;
  homeColor: string;
  awayColor: string;
  homeSubCount: number;
  awaySubCount: number;
}

export function SquadTeamSwitcher({
  activeTeam,
  setActiveTeam,
  homeColor,
  awayColor,
  homeSubCount,
  awaySubCount,
}: SquadTeamSwitcherProps) {
  return (
    <div className="p-2.5 space-y-2">
      <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-white/5 border border-white/[0.08]">
        <button
          type="button"
          onClick={() => setActiveTeam('home')}
          className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
            activeTeam === 'home'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <span
            className="w-2 h-2 rounded-full border border-white/30 shrink-0"
            style={{ backgroundColor: homeColor }}
          />
          <span>HOME</span>
          <span className="text-[10px] opacity-70">({homeSubCount} Sub)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTeam('away')}
          className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
            activeTeam === 'away'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <span
            className="w-2 h-2 rounded-full border border-white/30 shrink-0"
            style={{ backgroundColor: awayColor }}
          />
          <span>AWAY</span>
          <span className="text-[10px] opacity-70">({awaySubCount} Sub)</span>
        </button>
      </div>
    </div>
  );
}
