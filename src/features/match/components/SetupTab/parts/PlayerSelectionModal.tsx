'use client';

import { useEffect, useMemo, useRef, type FormEvent } from 'react';
import { Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TempPlayer } from '@/lib/db';
import { cn } from '@/lib/utils/cn';

import { groupAndSortPlayers } from '../utils/playerListUtils';
import { formatPlayerListLabel } from '../utils/playerLabel';
import type { PlayerFormState } from '../hooks/usePlayerRegistration';

interface PlayerSelectionModalProps {
  isOpen: boolean;
  title: string;
  positionLabel?: string;
  currentPlayerLabel?: string;
  selectedPlayerId?: number;
  players: TempPlayer[];
  currentAssignedPlayers?: Record<number, number>;
  substitutedOutPlayers?: TempPlayer[];
  formState: PlayerFormState;
  isSubmitting: boolean;
  isAssigning: boolean;
  onClose: () => void;
  onFormChange: (field: keyof PlayerFormState, value: string) => void;
  onFormSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPlayerSelect: (playerId: number) => void;
  onClearSelection: () => void;
  initialGroupKey?: string | null;
}

export const PlayerSelectionModal = ({
  isOpen,
  title,
  positionLabel,
  currentPlayerLabel,
  selectedPlayerId,
  players,
  currentAssignedPlayers,
  substitutedOutPlayers,
  formState,
  isSubmitting,
  isAssigning,
  onClose,
  onFormChange,
  onFormSubmit,
  onPlayerSelect,
  onClearSelection,
  initialGroupKey,
}: PlayerSelectionModalProps) => {
  const assignedIds = useMemo(
    () =>
      new Set(
        Object.values(currentAssignedPlayers ?? {}).filter(
          (playerId): playerId is number =>
            typeof playerId === 'number' && Number.isFinite(playerId)
        )
      ),
    [currentAssignedPlayers]
  );

  const substitutedIds = useMemo(
    () =>
      new Set(
        (substitutedOutPlayers ?? [])
          .map(player => (typeof player.id === 'number' ? player.id : null))
          .filter((playerId): playerId is number => playerId != null)
      ),
    [substitutedOutPlayers]
  );

  const candidatePlayers = players.filter(player => {
    const playerId = player.id;
    if (typeof playerId !== 'number') {
      return false;
    }

    if (playerId === selectedPlayerId) {
      return true;
    }

    const isAssigned = assignedIds.has(playerId);
    const isSubstituted = substitutedIds.has(playerId);

    return !isAssigned && !isSubstituted;
  });

  const groupedPlayers = groupAndSortPlayers(candidatePlayers);
  const groupRefs = useRef<Map<string, HTMLHeadingElement>>(new Map());

  useEffect(() => {
    if (isOpen && initialGroupKey) {
      const node = groupRefs.current.get(initialGroupKey);
      node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [initialGroupKey, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      groupRefs.current.clear();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const canClear = Boolean(selectedPlayerId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
      onPointerDown={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
        onPointerDown={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
            {positionLabel ? (
              <p className="text-xs text-slate-400">
                {positionLabel} に割り当てる選手を選択してください。
              </p>
            ) : null}
            {currentPlayerLabel ? (
              <p className="text-xs text-slate-500">現在: {currentPlayerLabel}</p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="モーダルを閉じる"
            className="text-slate-400 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-6 sm:grid-cols-[2fr_1fr]">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">登録済み選手</h3>
            <ScrollArea className="h-[45vh] pr-2">
              {candidatePlayers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {players.length === 0
                    ? '選手が登録されていません。右側のフォームから追加してください。'
                    : '割り当て可能な選手がいません。'}
                </p>
              ) : (
                <div className="space-y-4 pr-1">
                  {Object.entries(groupedPlayers).map(([groupName, groupPlayers]) => (
                    <div key={groupName} className="space-y-2">
                      <h4
                        ref={node => {
                          if (node) {
                            groupRefs.current.set(groupName, node);
                          } else {
                            groupRefs.current.delete(groupName);
                          }
                        }}
                        className="sticky top-0 mb-1.5 bg-slate-950/80 px-1 py-1 text-xs font-semibold text-slate-400 uppercase backdrop-blur-sm"
                      >
                        {groupName}
                      </h4>
                      <div className="space-y-2">
                        {groupPlayers.map(player => {
                          if (typeof player.id !== 'number') {
                            return null;
                          }

                          const playerId = player.id;
                          const label = formatPlayerListLabel(
                            player,
                            positionLabel ?? 'ポジション'
                          );
                          const isSelected = playerId === selectedPlayerId;

                          return (
                            <button
                              key={playerId}
                              type="button"
                              className={cn(
                                'flex w-full items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-left text-sm text-slate-100 transition hover:border-sky-500/70 hover:bg-slate-900/70',
                                isSelected &&
                                  'border-sky-400/80 bg-sky-400/10 text-sky-200'
                              )}
                              onClick={() =>
                                !isAssigning ? onPlayerSelect(playerId) : undefined
                              }
                              disabled={isAssigning}
                            >
                              <span>{label}</span>
                              {isSelected ? <Check className="h-4 w-4" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClearSelection}
                disabled={!canClear || isAssigning}
              >
                割り当てをクリア
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
            <h3 className="text-sm font-semibold text-slate-300">選手を追加</h3>
            <form onSubmit={onFormSubmit} className="space-y-3">
              <Input
                placeholder="選手名"
                value={formState.name}
                onChange={event => onFormChange('name', event.target.value)}
                required
              />
              <Input
                type="number"
                placeholder="背番号"
                value={formState.number}
                onChange={event => onFormChange('number', event.target.value)}
                required
              />
              <Input
                placeholder="ポジション"
                value={formState.position}
                onChange={event => onFormChange('position', event.target.value)}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? '登録中...' : '登録する'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
