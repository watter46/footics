'use client';

import { Circle, Hash, ImageIcon, Palette } from 'lucide-react';
import { useState } from 'react';
import { FormationTeamColorPicker } from './formation-team-color-picker';
import { ScaleSlider } from './scale-slider';

export interface FormationTeamToggleProps {
  activeTeam: 'home' | 'away' | 'both';
  onTeamChange: (team: 'home' | 'away' | 'both') => void;
  homeColor: string;
  awayColor: string;
  onColorChange: (team: 'home' | 'away', color: string) => void;
  teamPlayersCount: { home: number; away: number };
  currentInsideContent: 'number' | 'photo' | 'none';
  onDisplayModeChange: (mode: 'number' | 'photo' | 'none') => void;
  currentBottomLabel: 'name' | 'number' | 'none';
  onBottomLabelChange: (label: 'name' | 'number' | 'none') => void;
  currentMarkerScale: number;
  onMarkerScaleChange: (scale: number) => void;
  currentBallScale: number;
  onBallScaleChange: (scale: number) => void;
}

function TeamDots({
  team,
  homeColor,
  awayColor,
}: {
  team: 'home' | 'away' | 'both';
  homeColor: string;
  awayColor: string;
}) {
  if (team === 'both') {
    return (
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
    );
  }
  return (
    <span
      className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
      style={{ backgroundColor: team === 'home' ? homeColor : awayColor }}
    />
  );
}

const TEAMS = [
  {
    id: 'home' as const,
    label: 'HOME',
    activeClass: 'bg-blue-600 text-white shadow-sm font-semibold',
  },
  {
    id: 'away' as const,
    label: 'AWAY',
    activeClass: 'bg-red-600 text-white shadow-sm font-semibold',
  },
  {
    id: 'both' as const,
    label: 'BOTH',
    activeClass: 'bg-purple-600 text-white shadow-sm font-semibold',
  },
];

const DISPLAY_MODES = [
  {
    id: 'number' as const,
    label: 'Num',
    icon: Hash,
    title: 'Set Number',
    ariaLabel: 'Display Mode Number',
  },
  {
    id: 'photo' as const,
    label: 'Photo',
    icon: ImageIcon,
    title: 'Set Photo',
    ariaLabel: 'Display Mode Photo',
  },
  {
    id: 'none' as const,
    label: 'Empty',
    icon: Circle,
    title: 'Set Empty',
    ariaLabel: 'Display Mode Empty',
  },
];

const BOTTOM_LABELS = [
  {
    id: 'name' as const,
    label: 'Name',
    title: 'Set Name label',
    ariaLabel: 'Bottom Label Name',
  },
  {
    id: 'number' as const,
    label: 'Num',
    title: 'Set Number label',
    ariaLabel: 'Bottom Label Number',
  },
  {
    id: 'none' as const,
    label: 'None',
    title: 'Hide bottom label',
    ariaLabel: 'Bottom Label None',
  },
];

export function FormationTeamToggle({
  activeTeam,
  onTeamChange,
  homeColor,
  awayColor,
  onColorChange,
  teamPlayersCount,
  currentInsideContent,
  onDisplayModeChange,
  currentBottomLabel,
  onBottomLabelChange,
  currentMarkerScale,
  onMarkerScaleChange,
  currentBallScale,
  onBallScaleChange,
}: FormationTeamToggleProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const getTeamCount = (team: 'home' | 'away' | 'both') =>
    team === 'home'
      ? teamPlayersCount.home
      : team === 'away'
        ? teamPlayersCount.away
        : teamPlayersCount.home + teamPlayersCount.away;

  return (
    <div className="p-2.5 space-y-2.5">
      {/* 1段目: 独立したチーム選択ボタン (Home | Away | Both) */}
      <div className="grid grid-cols-3 gap-1.5 p-0.5 rounded-lg bg-white/5 border border-white/[0.08]">
        {TEAMS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTeamChange(t.id)}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium text-xs transition-all cursor-pointer ${
              activeTeam === t.id
                ? t.activeClass
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <TeamDots team={t.id} homeColor={homeColor} awayColor={awayColor} />
            <span>{t.label}</span>
            <span className="text-[10px] opacity-75">
              ({getTeamCount(t.id)})
            </span>
          </button>
        ))}
      </div>

      {/* 2段目: チーム色 (ピッチ表示フィルタAll/H/Aは削除) */}
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
          <TeamDots
            team={activeTeam}
            homeColor={homeColor}
            awayColor={awayColor}
          />
        </button>
      </div>

      {/* Inline Color Picker Accordion */}
      {showColorPicker && (
        <FormationTeamColorPicker
          activeTeam={activeTeam}
          homeColor={homeColor}
          awayColor={awayColor}
          onColorChange={onColorChange}
        />
      )}

      {/* Display Mode Batch Toggle (Num / Photo / Empty) */}
      <div className="flex items-center justify-between text-[11px] px-0.5">
        <span className="text-white/60 font-medium">Display Mode</span>
        <div className="flex items-center gap-0.5 bg-black/50 rounded border border-white/[0.08] p-0.5">
          {DISPLAY_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = currentInsideContent === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onDisplayModeChange(mode.id)}
                aria-label={mode.ariaLabel}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] uppercase font-medium cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#FF8100]/24 text-[#FFA336] border border-[#FF8100]/80'
                    : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
                title={`${mode.title} for selected team`}
              >
                <Icon size={9} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Label Batch Toggle (Name / Num / None) */}
      <div className="flex items-center justify-between text-[11px] px-0.5">
        <span className="text-white/60 font-medium">Bottom Label</span>
        <div className="flex items-center gap-0.5 bg-black/50 rounded border border-white/[0.08] p-0.5">
          {BOTTOM_LABELS.map((label) => {
            const isSelected = currentBottomLabel === label.id;
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => onBottomLabelChange(label.id)}
                aria-label={label.ariaLabel}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] uppercase font-medium cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#FF8100]/24 text-[#FFA336] border border-[#FF8100]/80'
                    : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
                title={`${label.title} for selected team`}
              >
                <span>{label.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Marker Size & Ball Size Sliders */}
      <ScaleSlider
        id="marker-size-slider"
        label="Marker Size"
        value={currentMarkerScale}
        onChange={onMarkerScaleChange}
      />
      <ScaleSlider
        id="ball-size-slider"
        label="Ball Size"
        value={currentBallScale}
        onChange={onBallScaleChange}
      />
    </div>
  );
}
