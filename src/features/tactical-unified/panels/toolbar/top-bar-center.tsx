'use client';

import { ArrowLeftRight, ArrowUpDown, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  SegmentedControl,
  type SegmentOption,
} from '@/components/ui/segmented-control';
import { isVerticalPitch } from '@/features/tactical-unified/stores/slide-flip-helpers';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import type { AspectRatio } from '@/lib/types/tactical-unified';

const ASPECT_RATIO_OPTIONS: SegmentOption<AspectRatio>[] = [
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
  { id: '4:5', label: '4:5' },
  { id: '1:1', label: '1:1' },
];

type Visibility = 'both' | 'home' | 'away';

function createTeamDot(color: string) {
  return function TeamDot() {
    return (
      <span
        className="size-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
    );
  };
}

export function TopBarCenter() {
  const aspectRatio = useTacticalUnifiedStoreContext(
    (s) => s.project.aspectRatio,
  );
  const setAspectRatio = useTacticalUnifiedStoreContext(
    (s) => s.setAspectRatio,
  );
  const teamVisibility = useTacticalUnifiedStoreContext(
    (s) => s.teamVisibility,
  );
  const setTeamVisibility = useTacticalUnifiedStoreContext(
    (s) => s.setTeamVisibility,
  );
  const homeColor = useTacticalUnifiedStoreContext(
    (s) => s.project.homeColor.primary,
  );
  const awayColor = useTacticalUnifiedStoreContext(
    (s) => s.project.awayColor.primary,
  );
  const swapTeamSides = useTacticalUnifiedStoreContext((s) => s.swapTeamSides);
  const resetSlideKeepSquad = useTacticalUnifiedStoreContext(
    (s) => s.resetSlideKeepSquad,
  );

  const isVertical = isVerticalPitch(aspectRatio);

  const visibilityOptions = useMemo<SegmentOption<Visibility>[]>(
    () => [
      { id: 'both', label: 'Both' },
      { id: 'home', label: 'Home', icon: createTeamDot(homeColor) },
      { id: 'away', label: 'Away', icon: createTeamDot(awayColor) },
    ],
    [homeColor, awayColor],
  );

  return (
    <div className="flex items-center justify-center min-w-0 shrink overflow-hidden gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => swapTeamSides()}
        icon={
          isVertical ? (
            <ArrowUpDown size={12} className="text-[#FF8100]" />
          ) : (
            <ArrowLeftRight size={12} className="text-[#FF8100]" />
          )
        }
        title={
          isVertical
            ? '攻守交代・陣地反転 (上下反転)'
            : '攻守交代・陣地反転 (左右反転)'
        }
        aria-label="Swap team sides"
      >
        <span className="hidden 2xl:inline">Swap</span>
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => resetSlideKeepSquad()}
        icon={<RotateCcw size={12} className="text-[#A1A1AA]" />}
        title="配置・オブジェクトをリセット（メンバー維持）"
        aria-label="配置・オブジェクトをリセット（メンバー維持）"
      >
        <span className="hidden 2xl:inline">Reset</span>
      </Button>

      <SegmentedControl
        value={teamVisibility}
        onChange={setTeamVisibility}
        options={visibilityOptions}
      />

      <SegmentedControl
        value={aspectRatio}
        onChange={setAspectRatio}
        options={ASPECT_RATIO_OPTIONS}
        className="font-mono"
      />
    </div>
  );
}
