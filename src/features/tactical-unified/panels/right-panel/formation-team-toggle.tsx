'use client';

import { Palette } from 'lucide-react';
import { useState } from 'react';
import { ColorInput } from '../inspector/common-color-input';

interface FormationTeamToggleProps {
  activeTeam: 'home' | 'away';
  onTeamChange: (team: 'home' | 'away') => void;
  homeColor: string;
  awayColor: string;
  onColorChange: (team: 'home' | 'away', color: string) => void;
  teamPlayersCount: { home: number; away: number };
  teamVisibility: 'both' | 'home' | 'away';
  onVisibilityChange: (visibility: 'both' | 'home' | 'away') => void;
}

export function FormationTeamToggle({
  activeTeam,
  onTeamChange,
  homeColor,
  awayColor,
  onColorChange,
  teamPlayersCount,
  teamVisibility,
  onVisibilityChange,
}: FormationTeamToggleProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const teamColor = activeTeam === 'home' ? homeColor : awayColor;

  return (
    <div className="p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-1.5">
        {/* Team Toggle Buttons */}
        <div className="grid grid-cols-2 gap-1 flex-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
          <button
            type="button"
            onClick={() => onTeamChange('home')}
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
            <span className="text-[10px] opacity-70">
              ({teamPlayersCount.home})
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTeamChange('away')}
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
            <span className="text-[10px] opacity-70">
              ({teamPlayersCount.away})
            </span>
          </button>
        </div>

        {/* Color Picker Popover Toggle */}
        <button
          type="button"
          onClick={() => setShowColorPicker((v) => !v)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
          title={`${activeTeam === 'home' ? 'Home' : 'Away'} Color`}
        >
          <Palette size={12} className="text-blue-400" />
          <span
            className="w-2.5 h-2.5 rounded-full border border-white/30 inline-block"
            style={{ backgroundColor: teamColor }}
          />
        </button>

        {/* Pitch Visibility Filter */}
        <div className="flex items-center bg-black/40 rounded-lg border border-white/10 p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onVisibilityChange('both')}
            className={`px-1.5 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              teamVisibility === 'both'
                ? 'bg-white/20 text-white font-semibold shadow-xs'
                : 'text-white/40 hover:text-white'
            }`}
            title="Show both teams"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onVisibilityChange('home')}
            className={`px-1.5 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              teamVisibility === 'home'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-white/40 hover:text-white'
            }`}
            title="Home only"
          >
            H
          </button>
          <button
            type="button"
            onClick={() => onVisibilityChange('away')}
            className={`px-1.5 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              teamVisibility === 'away'
                ? 'bg-red-600 text-white font-semibold shadow-xs'
                : 'text-white/40 hover:text-white'
            }`}
            title="Away only"
          >
            A
          </button>
        </div>
      </div>

      {/* Inline Color Picker Accordion */}
      {showColorPicker && (
        <div className="p-2 rounded-lg bg-black/40 border border-white/10 space-y-1.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[10px] text-white/60">
            <span>{activeTeam === 'home' ? 'Home' : 'Away'} Team Color</span>
            <span className="font-mono text-white/40">{teamColor}</span>
          </div>
          <ColorInput
            value={teamColor}
            onChange={(c) => onColorChange(activeTeam, c)}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
