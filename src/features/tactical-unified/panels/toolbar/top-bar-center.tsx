'use client';

import {
  ArrowLeftRight,
  ArrowUpDown,
  Clapperboard,
  RotateCcw,
} from 'lucide-react';
import { useMemo } from 'react';
import { IconButton } from '@/components/ui/icon-button';
import {
  SegmentedControl,
  type SegmentOption,
} from '@/components/ui/segmented-control';
import { selectDomainActivePhaseAspectRatio } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  type AspectRatio,
  isVerticalAspectRatio,
} from '@/lib/types/tactical/primitives';

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
  const workspaceMode = useSessionStore((s) => s.workspaceMode);
  const toggleWorkspaceMode = useSessionStore((s) => s.toggleWorkspaceMode);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const teamVisibility = useSessionStore((s) => s.teamVisibility);
  const setTeamVisibility = useSessionStore((s) => s.setTeamVisibility);

  const aspectRatio = useDocumentStore((s) =>
    selectDomainActivePhaseAspectRatio(s.project, activePhaseId),
  );
  const homeColor = useDocumentStore((s) => s.project.homeColor.primary);
  const awayColor = useDocumentStore((s) => s.project.awayColor.primary);
  const dispatch = useDocumentStore((s) => s.dispatch);

  const setAspectRatio = (next: AspectRatio) => {
    dispatch({
      type: 'CHANGE_PHASE_ASPECT_RATIO',
      phaseId: activePhaseId,
      aspectRatio: next,
    });
  };
  const swapTeamSides = () => {
    dispatch({
      type: 'APPLY_SLIDE_COMMAND',
      phaseId: activePhaseId,
      slideId: activeSlideId,
      command: { type: 'SWAP_TEAM_SIDES' },
    });
  };
  const resetSlideKeepSquad = () => {
    dispatch({
      type: 'RESET_SLIDE_KEEP_SQUAD',
      phaseId: activePhaseId,
      slideId: activeSlideId,
    });
  };

  const isVertical = isVerticalAspectRatio(aspectRatio);

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
      <IconButton
        variant="subtle"
        size="sm"
        onClick={() => swapTeamSides()}
        title={
          isVertical
            ? '攻守交代・陣地反転 (上下反転)'
            : '攻守交代・陣地反転 (左右反転)'
        }
        aria-label="Swap team sides"
        className="whitespace-nowrap shrink-0"
      >
        {isVertical ? (
          <ArrowUpDown size={13} className="text-[#FF8100]" />
        ) : (
          <ArrowLeftRight size={13} className="text-[#FF8100]" />
        )}
      </IconButton>

      <IconButton
        variant="subtle"
        size="sm"
        onClick={() => resetSlideKeepSquad()}
        title="配置・オブジェクトをリセット（メンバー維持）"
        aria-label="配置・オブジェクトをリセット（メンバー維持）"
        className="whitespace-nowrap shrink-0"
      >
        <RotateCcw size={13} className="text-[#A1A1AA]" />
      </IconButton>

      <SegmentedControl
        value={teamVisibility}
        onChange={setTeamVisibility}
        options={visibilityOptions}
        className="whitespace-nowrap shrink-0"
      />

      <SegmentedControl
        value={aspectRatio}
        onChange={setAspectRatio}
        options={ASPECT_RATIO_OPTIONS}
        className="font-mono whitespace-nowrap shrink-0"
      />

      <IconButton
        variant="ghost"
        size="sm"
        isActive={workspaceMode === 'director'}
        onClick={toggleWorkspaceMode}
        title="Toggle Layout Mode"
        aria-label="Toggle Layout Mode"
        className="whitespace-nowrap shrink-0"
      >
        <Clapperboard size={15} strokeWidth={1.5} />
      </IconButton>
    </div>
  );
}
