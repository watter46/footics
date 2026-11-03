'use client';

import { ColorInput } from './color-input';

export interface FormationTeamColorPickerProps {
  activeTeam: 'home' | 'away' | 'both';
  homeColor: string;
  awayColor: string;
  onColorChange: (team: 'home' | 'away', color: string) => void;
}

export function FormationTeamColorPicker({
  activeTeam,
  homeColor,
  awayColor,
  onColorChange,
}: FormationTeamColorPickerProps) {
  return (
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
  );
}
