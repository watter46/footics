'use client';

import { Award } from 'lucide-react';
import type { Player } from '@/lib/types/tactical-unified';

export interface MarkerBadgeSectionProps {
  player: Player;
  slideId: string;
  updatePlayer: (slideId: string, id: string, p: Partial<Player>) => void;
  newBadgeText: string;
  setNewBadgeText: (s: string) => void;
}

export function MarkerBadgeSection({
  player,
  slideId,
  updatePlayer,
  newBadgeText,
  setNewBadgeText,
}: MarkerBadgeSectionProps) {
  const up = (p: Partial<Player>) => updatePlayer(slideId, player.id, p);

  const addBadge = (
    label: string,
    color = '#f59e0b',
    textColor = '#000000',
  ) => {
    if (!label.trim()) return;
    const badge = {
      id: crypto.randomUUID(),
      label: label.trim(),
      color,
      textColor,
      offsetX: 0,
      offsetY: -12,
      visible: true,
    };
    up({ badges: [...player.badges, badge] });
  };

  const removeBadge = (badgeId: string) => {
    up({ badges: player.badges.filter((b) => b.id !== badgeId) });
  };

  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
      <span className="text-[11px] font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
        <Award size={13} className="text-purple-400" />
        Player Badges
      </span>

      {/* Existing badges */}
      {player.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-black/40 border border-white/10">
          {player.badges.map((b) => (
            <span
              key={b.id}
              style={{ backgroundColor: b.color, color: b.textColor }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm"
            >
              {b.label}
              <button
                type="button"
                onClick={() => removeBadge(b.id)}
                className="hover:opacity-70 text-xs leading-none cursor-pointer"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Preset Badges */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-white/50 block">
          Quick Presets
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => addBadge('KEY', '#f59e0b', '#000000')}
            className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold hover:bg-amber-500/30 transition-all cursor-pointer shadow-xs"
          >
            + KEY
          </button>
          <button
            type="button"
            onClick={() => addBadge('★', '#eab308', '#000000')}
            className="px-2.5 py-1 rounded-md bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[10px] font-bold hover:bg-yellow-500/30 transition-all cursor-pointer shadow-xs"
          >
            + ★
          </button>
          <button
            type="button"
            onClick={() => addBadge('C', '#3b82f6', '#ffffff')}
            className="px-2.5 py-1 rounded-md bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-bold hover:bg-blue-500/30 transition-all cursor-pointer shadow-xs"
          >
            + C
          </button>
          <button
            type="button"
            onClick={() => addBadge('TARGET', '#ef4444', '#ffffff')}
            className="px-2.5 py-1 rounded-md bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold hover:bg-red-500/30 transition-all cursor-pointer shadow-xs"
          >
            + TARGET
          </button>
        </div>
      </div>

      {/* Custom Badge Form */}
      <div className="pt-2 border-t border-white/5 space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-white/50 block">
          Custom Label
        </span>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="Custom badge label"
            value={newBadgeText}
            onChange={(e) => setNewBadgeText(e.target.value)}
            className="flex-1 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => {
              addBadge(newBadgeText);
              setNewBadgeText('');
            }}
            disabled={!newBadgeText.trim()}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-semibold text-white transition-all cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
