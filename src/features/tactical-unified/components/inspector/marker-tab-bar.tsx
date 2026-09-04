'use client';

import {
  Eye,
  Link,
  MoveRight,
  Pipette,
  Settings,
  Sparkles,
} from 'lucide-react';
import type { MarkerOptionTab } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { ArrowAnnotation, Player } from '@/lib/types/tactical-unified';
import { DashedArrowIcon } from './inspector-shared-controls';
import { useMarkerTabActions } from './use-marker-tab-actions';

const ACTION_TABS = [
  {
    id: 'arrow_solid' as const,
    label: 'Solid',
    icon: MoveRight,
    activeBg: 'bg-sky-600 text-white shadow-md',
    title: 'Solid Arrow (Click to add)',
  },
  {
    id: 'arrow_dash' as const,
    label: 'Dashed',
    icon: DashedArrowIcon,
    activeBg: 'bg-amber-600 text-white shadow-md',
    title: 'Dashed Arrow (Click to add)',
  },
  {
    id: 'connect' as const,
    label: 'Connect',
    icon: Link,
    activeBg: 'bg-emerald-600 text-white shadow-md',
    title: 'Connect (Click to link players)',
  },
  {
    id: 'vision' as const,
    label: 'Vision',
    icon: Eye,
    activeBg: 'bg-blue-600 text-white shadow-md',
    title: 'Vision Cone (Click to enable)',
  },
  {
    id: 'focus' as const,
    label: 'Focus',
    icon: Sparkles,
    activeBg: 'bg-yellow-500 text-black font-bold shadow-md',
    title: 'Focus / Spotlight (Click to highlight)',
  },
];

export interface MarkerTabBarProps {
  currentTab: MarkerOptionTab;
  onSelectTab: (tab: MarkerOptionTab) => void;
  player: Player;
  slideId: string;
  updatePlayer: (slideId: string, id: string, p: Partial<Player>) => void;
  addArrow: (slideId: string, arrow: ArrowAnnotation) => void;
}

export function MarkerTabBar({
  currentTab,
  onSelectTab,
  player,
  slideId,
  updatePlayer,
  addArrow,
}: MarkerTabBarProps) {
  const { handleTabClick, handleSpuit } = useMarkerTabActions({
    onSelectTab,
    player,
    slideId,
    updatePlayer,
    addArrow,
  });

  return (
    <>
      {/* ── Top Row: Basic Settings Toggle ── */}
      <div className="flex items-center justify-between p-1 rounded-xl bg-white/5 border border-white/10">
        <button
          type="button"
          onClick={() => handleTabClick('basic')}
          className={`flex items-center justify-center gap-2 w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            currentTab === 'basic'
              ? 'bg-zinc-700 text-white shadow-md ring-1 ring-white/20'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
          title="Basic Settings (Inside content, label, style, scale, badges)"
        >
          <Settings size={14} className="text-zinc-400" />
          <span>Basic Settings</span>
        </button>
      </div>

      {/* ── 6-Tab Object Action Icons: Solid, Dashed, Connect, Vision, Focus, Spuit ── */}
      <div className="grid grid-cols-6 gap-1 p-1 rounded-xl bg-white/5 border border-white/10 shrink-0">
        {ACTION_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-all cursor-pointer ${
                isActive
                  ? tab.activeBg
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title={tab.title}
            >
              <Icon size={14} />
              <span className="text-[9px] mt-1 font-medium leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* 6. Spuit (Eyedropper) */}
        <button
          type="button"
          onClick={handleSpuit}
          className="flex flex-col items-center justify-center py-2 px-0.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          title="Spuit (Pick color from screen)"
        >
          <Pipette size={14} className="text-pink-400" />
          <span className="text-[9px] mt-1 font-medium leading-none">
            Spuit
          </span>
        </button>
      </div>
    </>
  );
}
