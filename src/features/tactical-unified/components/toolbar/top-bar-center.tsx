'use client';

import { LayoutTemplate } from 'lucide-react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { AspectRatio } from '@/lib/types/tactical-unified';

const ASPECT_RATIO_OPTIONS: {
  ratio: AspectRatio;
  label: string;
  title: string;
}[] = [
  {
    ratio: '16:9',
    label: '16:9',
    title: '横長 (16:9) - ピッチ全体俯瞰・YouTube / PC',
  },
  {
    ratio: '9:16',
    label: '9:16',
    title: '縦長 (9:16) - カルーセル・スマホ全画面・リール',
  },
  {
    ratio: '4:5',
    label: '4:5',
    title: '縦長 (4:5) - X単体画像・TL最大高さ',
  },
  {
    ratio: '1:1',
    label: '1:1',
    title: '正方形 (1:1) - Instagram・スクエア',
  },
];

export function TopBarCenter() {
  const aspectRatio = useTacticalUnifiedStore((s) => s.project.aspectRatio);
  const setAspectRatio = useTacticalUnifiedStore((s) => s.setAspectRatio);
  const teamVisibility = useTacticalUnifiedStore((s) => s.teamVisibility);
  const setTeamVisibility = useTacticalUnifiedStore((s) => s.setTeamVisibility);
  const homeColor = useTacticalUnifiedStore((s) => s.project.homeColor.primary);
  const awayColor = useTacticalUnifiedStore((s) => s.project.awayColor.primary);

  return (
    <div className="flex items-center gap-2">
      {/* Team Visibility Quick Filter (Both / Home / Away) */}
      <div className="flex items-center bg-white/5 rounded-md border border-white/10 p-0.5 text-xs">
        <button
          type="button"
          onClick={() => setTeamVisibility('both')}
          className={`px-2 py-0.5 rounded transition-colors text-[11px] font-medium cursor-pointer ${
            teamVisibility === 'both'
              ? 'bg-white/20 text-white font-semibold shadow-xs'
              : 'text-white/50 hover:text-white/80'
          }`}
          title="Show both teams"
        >
          Both
        </button>
        <button
          type="button"
          onClick={() => setTeamVisibility('home')}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors text-[11px] font-medium cursor-pointer ${
            teamVisibility === 'home'
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'text-white/50 hover:text-white/80'
          }`}
          title="Show Home team only"
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: homeColor }}
          />
          <span>Home</span>
        </button>
        <button
          type="button"
          onClick={() => setTeamVisibility('away')}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors text-[11px] font-medium cursor-pointer ${
            teamVisibility === 'away'
              ? 'bg-red-600 text-white font-semibold shadow-xs'
              : 'text-white/50 hover:text-white/80'
          }`}
          title="Show Away team only"
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: awayColor }}
          />
          <span>Away</span>
        </button>
      </div>

      {/* Aspect Ratio 4-Tab Segmented Control */}
      <div
        className="flex items-center bg-white/5 rounded-md border border-white/10 p-0.5 text-xs font-mono"
        role="group"
        aria-label="Aspect Ratio Selector"
      >
        <LayoutTemplate size={12} className="text-blue-400 mx-1 shrink-0" />
        {ASPECT_RATIO_OPTIONS.map(({ ratio, label, title }) => {
          const isActive = aspectRatio === ratio;
          return (
            <button
              key={ratio}
              type="button"
              onClick={() => setAspectRatio(ratio)}
              className={`px-2 py-0.5 rounded transition-colors text-[11px] font-medium cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-white/50 hover:text-white/80'
              }`}
              title={title}
              aria-label={`Aspect ratio ${label}`}
              aria-pressed={isActive}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
