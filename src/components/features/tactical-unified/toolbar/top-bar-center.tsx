'use client';

import { LayoutTemplate } from 'lucide-react';
import type { AspectRatio } from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';

export function TopBarCenter() {
  const aspectRatio = useTacticalUnifiedStore((s) => s.project.aspectRatio);
  const setAspectRatio = useTacticalUnifiedStore((s) => s.setAspectRatio);
  const teamVisibility = useTacticalUnifiedStore((s) => s.teamVisibility);
  const setTeamVisibility = useTacticalUnifiedStore((s) => s.setTeamVisibility);
  const homeColor = useTacticalUnifiedStore((s) => s.project.homeColor.primary);
  const awayColor = useTacticalUnifiedStore((s) => s.project.awayColor.primary);

  const nextRatio: AspectRatio = aspectRatio === '16:9' ? '9:16' : '16:9';

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

      {/* Aspect Ratio */}
      <button
        type="button"
        onClick={() => setAspectRatio(nextRatio)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/80 hover:text-white transition-colors cursor-pointer"
        aria-label="Switch aspect ratio"
        title="Switch Aspect Ratio (16:9 / 9:16)"
      >
        <LayoutTemplate size={13} className="text-blue-400" />
        <span>{aspectRatio}</span>
      </button>
    </div>
  );
}
