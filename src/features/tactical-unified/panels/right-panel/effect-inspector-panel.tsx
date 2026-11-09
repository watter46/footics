'use client';

import {
  Activity,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  ArrowEffectSection,
  DEFAULT_ARROW_EFFECT,
} from './arrow-effect-section';
import {
  DEFAULT_MARKER_EFFECT,
  MarkerEffectSection,
} from './marker-effect-section';
import {
  DEFAULT_PLAYER_TRAJECTORY_EFFECT,
  PlayerTrajectoryEffectSection,
} from './player-trajectory-effect-section';
import { DEFAULT_ZONE_EFFECT, ZoneEffectSection } from './zone-effect-section';

export {
  DEFAULT_ARROW_EFFECT,
  DEFAULT_MARKER_EFFECT,
  DEFAULT_PLAYER_TRAJECTORY_EFFECT,
  DEFAULT_ZONE_EFFECT,
};

export function EffectInspectorPanel(): React.ReactElement | null {
  const [isExpanded, setIsExpanded] = useState(true);

  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const selectedObjects = useTacticalUnifiedStoreContext(
    (s) => s.selectedObjects,
  );
  const project = useTacticalUnifiedStoreContext((s) => s.project);
  const updateArrow = useTacticalUnifiedStoreContext((s) => s.updateArrow);
  const updatePlayer = useTacticalUnifiedStoreContext((s) => s.updatePlayer);
  const updateZone = useTacticalUnifiedStoreContext((s) => s.updateZone);

  if (selectedObjects.length !== 1) {
    return null;
  }

  const selected = selectedObjects[0];
  if (!selected) {
    return null;
  }

  const slide = project.phases
    .flatMap((ph) => ph.slides)
    .find((sl) => sl.id === activeSlideId);

  if (!slide) {
    return null;
  }

  if (selected.kind === 'zone') {
    const zone = slide.zones.find((z) => z.id === selected.id);
    if (!zone) return null;

    return (
      <div
        data-testid="zone-effect-inspector"
        className="border-b border-white/[0.08] bg-[#16161a]"
      >
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#FF8100]" />
            <span>エフェクト設定 (ゾーンパルス)</span>
          </div>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {isExpanded && (
          <div className="p-3 pt-1">
            <ZoneEffectSection
              zone={zone}
              onUpdate={(patch) => updateZone(activeSlideId, zone.id, patch)}
            />
          </div>
        )}
      </div>
    );
  }

  if (selected.kind === 'arrow') {
    const arrow = slide.arrows.find((a) => a.id === selected.id);
    if (!arrow) return null;

    return (
      <div
        data-testid="arrow-effect-inspector"
        className="border-b border-white/[0.08] bg-[#16161a]"
      >
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#FF8100]" />
            <span>エフェクト設定 (矢印伸長)</span>
          </div>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {isExpanded && (
          <div className="p-3 pt-1">
            <ArrowEffectSection
              arrow={arrow}
              onUpdate={(patch) => updateArrow(activeSlideId, arrow.id, patch)}
            />
          </div>
        )}
      </div>
    );
  }

  if (selected.kind === 'player') {
    const player = slide.players.find((p) => p.id === selected.id);
    if (!player) return null;

    return (
      <div
        data-testid="player-effect-inspector"
        className="border-b border-white/[0.08] bg-[#16161a]"
      >
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#FF8100]" />
            <span>エフェクト設定 (選手エフェクト)</span>
          </div>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {isExpanded && (
          <div className="p-3 pt-1 space-y-4">
            <MarkerEffectSection
              player={player}
              onUpdate={(patch) =>
                updatePlayer(activeSlideId, player.id, patch)
              }
            />
            <div className="border-t border-white/[0.06] pt-3">
              <PlayerTrajectoryEffectSection
                player={player}
                onUpdate={(patch) =>
                  updatePlayer(activeSlideId, player.id, patch)
                }
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
