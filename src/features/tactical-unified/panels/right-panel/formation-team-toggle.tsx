'use client';

import { Circle, Hash, ImageIcon, Palette } from 'lucide-react';
import { useState } from 'react';
import { ColorInput } from './color-input';

export interface FormationTeamToggleProps {
  activeTeam: 'home' | 'away' | 'both';
  onTeamChange: (team: 'home' | 'away' | 'both') => void;
  homeColor: string;
  awayColor: string;
  onColorChange: (team: 'home' | 'away', color: string) => void;
  teamPlayersCount: { home: number; away: number };
  teamVisibility: 'both' | 'home' | 'away';
  onVisibilityChange: (visibility: 'both' | 'home' | 'away') => void;
  onDisplayModeChange?: (mode: 'number' | 'photo' | 'none') => void;
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
  onDisplayModeChange,
}: FormationTeamToggleProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div className="p-2.5 space-y-2">
      {/* 1段目: 独立したチーム選択ボタン (Home | Away | Both) */}
      <div className="grid grid-cols-3 gap-1.5 p-0.5 rounded-lg bg-white/5 border border-white/[0.08]">
        <button
          type="button"
          onClick={() => onTeamChange('home')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium text-xs transition-all cursor-pointer ${
            activeTeam === 'home'
              ? 'bg-blue-600 text-white shadow-sm font-semibold'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
            style={{ backgroundColor: homeColor }}
          />
          <span>HOME</span>
          <span className="text-[10px] opacity-75">
            ({teamPlayersCount.home})
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTeamChange('away')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium text-xs transition-all cursor-pointer ${
            activeTeam === 'away'
              ? 'bg-red-600 text-white shadow-sm font-semibold'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
            style={{ backgroundColor: awayColor }}
          />
          <span>AWAY</span>
          <span className="text-[10px] opacity-75">
            ({teamPlayersCount.away})
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTeamChange('both')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium text-xs transition-all cursor-pointer ${
            activeTeam === 'both'
              ? 'bg-purple-600 text-white shadow-sm font-semibold'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="flex items-center -space-x-0.5 shrink-0">
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/30 z-10"
              style={{ backgroundColor: homeColor }}
            />
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/30"
              style={{ backgroundColor: awayColor }}
            />
          </span>
          <span>BOTH</span>
          <span className="text-[10px] opacity-75">
            ({teamPlayersCount.home + teamPlayersCount.away})
          </span>
        </button>
      </div>

      {/* 2段目: チーム色とピッチ表示フィルタ */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => setShowColorPicker((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/[0.08] text-white/70 hover:text-white text-xs transition-colors cursor-pointer shrink-0"
          title={
            activeTeam === 'both'
              ? 'Home & Away Colors'
              : `${activeTeam === 'home' ? 'Home' : 'Away'} Color`
          }
        >
          <Palette size={13} className="text-blue-400" />
          <span className="text-[11px] font-medium text-white/60">Color</span>
          {activeTeam === 'both' ? (
            <span className="flex items-center -space-x-1">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/30 inline-block z-10"
                style={{ backgroundColor: homeColor }}
              />
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/30 inline-block"
                style={{ backgroundColor: awayColor }}
              />
            </span>
          ) : (
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/30 inline-block"
              style={{
                backgroundColor: activeTeam === 'home' ? homeColor : awayColor,
              }}
            />
          )}
        </button>

        {/* Pitch Visibility Filter */}
        <div className="flex items-center bg-black/40 rounded-lg border border-white/[0.08] p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onVisibilityChange('both')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
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
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
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
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
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

      {/* Display Mode Batch Toggle (Num / Photo / Empty) */}
      {onDisplayModeChange && (
        <div className="flex items-center justify-between text-[11px] px-0.5">
          <span className="text-white/60 font-medium">Display Mode</span>
          <div className="flex items-center gap-0.5 bg-black/50 rounded border border-white/[0.08] p-0.5">
            <button
              type="button"
              onClick={() => onDisplayModeChange('number')}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
              title="Set Number for selected team"
            >
              <Hash size={9} />
              <span>Num</span>
            </button>
            <button
              type="button"
              onClick={() => onDisplayModeChange('photo')}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
              title="Set Photo for selected team"
            >
              <ImageIcon size={9} />
              <span>Photo</span>
            </button>
            <button
              type="button"
              onClick={() => onDisplayModeChange('none')}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
              title="Set Empty for selected team"
            >
              <Circle size={9} />
              <span>Empty</span>
            </button>
          </div>
        </div>
      )}

      {/* Inline Color Picker Accordion */}
      {showColorPicker && (
        <div className="p-2 rounded-lg bg-black/40 border border-white/[0.08] space-y-2 animate-in fade-in duration-150">
          {(activeTeam === 'home' || activeTeam === 'both') && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-white/60">
                <span className="flex items-center gap-1 text-blue-400 font-medium">
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block"
                    style={{ backgroundColor: homeColor }}
                  />
                  Home Team Color
                </span>
                <span className="font-mono text-white/40">{homeColor}</span>
              </div>
              <ColorInput
                value={homeColor}
                onChange={(c) => onColorChange('home', c)}
                className="w-full"
              />
            </div>
          )}

          {(activeTeam === 'away' || activeTeam === 'both') && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-white/60">
                <span className="flex items-center gap-1 text-red-400 font-medium">
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block"
                    style={{ backgroundColor: awayColor }}
                  />
                  Away Team Color
                </span>
                <span className="font-mono text-white/40">{awayColor}</span>
              </div>
              <ColorInput
                value={awayColor}
                onChange={(c) => onColorChange('away', c)}
                className="w-full"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
