'use client';

import { type PointerEvent } from 'react';

import { PlayerNode } from '@/components/formation';

import type { AssignModalContext, BenchItem } from '../hooks/useSetupTabState';

interface BenchSectionProps {
  items: BenchItem[];
  selectedBenchPlayerId: number | null;
  onSubstituteSelect: (playerId: number, isSelected: boolean) => void;
  onAssignSlot: (context: AssignModalContext) => void;
}

export const BenchSection = ({
  items,
  selectedBenchPlayerId,
  onSubstituteSelect,
  onAssignSlot,
}: BenchSectionProps) => {
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  if (items.length === 0) {
    return (
      <div
        className="text-center text-xs text-slate-500"
        onPointerDownCapture={handlePointerDown}
      >
        ベンチメンバーはまだ登録されていません。
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      onPointerDownCapture={handlePointerDown}
    >
      {items.map(item => {
        if (item.type === 'ghost') {
          return (
            <PlayerNode
              key={`ghost-${item.tempSlotId}`}
              positionLabel={item.position}
              variant="ghost"
              actionCount={item.count}
              onClick={() =>
                onAssignSlot({ tempSlotId: item.tempSlotId })
              }
            />
          );
        }

        const playerId =
          typeof item.player.id === 'number' ? item.player.id : null;
        if (playerId == null) {
          return null;
        }

        const isSubstituted = item.status === 'substituted';
        const isSelected = !isSubstituted && selectedBenchPlayerId === playerId;
        const handleClick = isSubstituted
          ? item.originalEventId
            ? () =>
                onAssignSlot({
                  eventId: item.originalEventId,
                  defaultPlayerId: playerId,
                })
            : undefined
          : () => onSubstituteSelect(playerId, isSelected);

        return (
          <PlayerNode
            key={`player-${playerId}`}
            player={item.player}
            positionLabel={item.player.position ?? '未設定'}
            variant={item.status === 'substituted' ? 'substituted' : 'default'}
            isSelected={isSelected}
            onClick={handleClick}
          />
        );
      })}
    </div>
  );
};
