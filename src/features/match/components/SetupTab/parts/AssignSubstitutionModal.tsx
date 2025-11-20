'use client';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { TempPlayer } from '@/lib/db';

import { SubstituteList } from './SubstituteList';
import { useAssignSubstitution } from '../hooks/useAssignSubstitution';

interface AssignSubstitutionModalProps {
  isOpen: boolean;
  tempSlotId?: string | null;
  eventId?: number | null;
  teamId: number;
  matchId: number;
  substitutedOutPlayers: TempPlayer[];
  defaultPlayerId?: number | null;
  onClose: () => void;
}

export const AssignSubstitutionModal = ({
  isOpen,
  tempSlotId,
  eventId,
  teamId,
  matchId,
  substitutedOutPlayers,
  defaultPlayerId,
  onClose,
}: AssignSubstitutionModalProps) => {
  const {
    selectedPlayerId,
    isSaving,
    relatedEvents,
    candidatePlayers,
    sheetTitle,
    isGhostContext,
    isEventContext,
    handlePlayerSelect,
    handleClose,
    handleAssign,
  } = useAssignSubstitution({
    isOpen,
    tempSlotId,
    eventId,
    teamId,
    matchId,
    substitutedOutPlayers,
    defaultPlayerId,
    onClose,
  });

  const handleSheetChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleSheetChange}>
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-100">{sheetTitle}</h2>
          <p className="text-xs text-slate-400">
            {isEventContext
              ? '交代済みイベントの割り当て内容を更新できます。'
              : '未割り当ての交代イベントに選手を紐付けてください。'}
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-800/70 bg-slate-900/40 p-4">
          <p className="text-sm font-semibold text-slate-200">関連アクション</p>
          {relatedEvents.length === 0 ? (
            <p className="text-xs text-slate-500">関連するアクションはありません。</p>
          ) : (
            <ul className="space-y-2">
              {relatedEvents.map(event => (
                <li
                  key={event.id}
                  className="rounded-lg border border-slate-800/60 bg-slate-900/30 px-3 py-2 text-sm text-slate-200"
                >
                  <span className="font-semibold text-sky-300">{event.actionName}</span>
                  <span className="ml-2 text-xs text-slate-400">{event.matchTime}</span>
                  {event.positionName ? (
                    <span className="ml-2 text-xs text-slate-500">
                      [{event.positionName}]
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-200">
              割り当てる選手を選択
            </p>
            {isEventContext ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handlePlayerSelect(0, true)} // 0 is dummy, true means deselect/clear
                disabled={selectedPlayerId == null || isSaving}
              >
                割り当て解除
              </Button>
            ) : null}
          </div>
          <SubstituteList
            players={candidatePlayers}
            selectedPlayerId={selectedPlayerId}
            onPlayerSelect={handlePlayerSelect}
            highlightVariant={isEventContext ? 'reassign' : 'default'}
          />
        </div>

        <Separator className="border-slate-800" />

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSaving}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={
              isSaving || (isGhostContext && selectedPlayerId == null)
            }
          >
            {isGhostContext ? '割り当てる' : '保存'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
