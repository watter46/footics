'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pitch, defaultPitchSettings } from '@/components/pitch';
import { Formation } from '@/components/formation';
import type { Match, TempPlayer } from '@/lib/db';
import type { FormationPlayers } from '@/lib/types';
import type { FormationType } from '@/lib/formation-template';
import { useFormationPlayers } from '@/features/match-detail/hooks/useFormationPlayers';
import { useFormationSelection } from '@/features/match-detail/hooks/useFormationSelection';
import { useFormationAssignments } from '@/features/match-detail/components/SetupTab/hooks/useFormationAssignments';
import { useTeamPlayers } from '@/features/match-detail/components/SetupTab/hooks/useTeamPlayers';
import { toast } from '@/features/toast/toast-store';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils/cn';

interface SetupTabProps {
  match: Match;
  teamNameById: Map<number, string>;
  currentFormation?: FormationType;
  resolvedPlayers?: FormationPlayers;
}

interface PlayerFormState {
  name: string;
  number: string;
  position: string;
}

const INITIAL_FORM: PlayerFormState = {
  name: '',
  number: '',
  position: '',
};

const DEFAULT_FORMATION: FormationType = '4-2-3-1';

const formatPlayerListLabel = (
  player: TempPlayer,
  fallbackPosition: string
): string => {
  const positionLabel = player.position?.trim() || fallbackPosition;
  const hasNumber = Number.isFinite(player.number);
  const numberFragment = hasNumber ? ` #${player.number}` : '';
  const nameFragment = player.name ? ` ${player.name}` : '';
  return `${positionLabel}${numberFragment}${nameFragment}`.trim();
};

interface PlayerSelectionModalProps {
  isOpen: boolean;
  title: string;
  positionLabel?: string;
  currentPlayerLabel?: string;
  selectedPlayerId?: number;
  players: TempPlayer[];
  formState: PlayerFormState;
  isSubmitting: boolean;
  isAssigning: boolean;
  onClose: () => void;
  onFormChange: (field: keyof PlayerFormState, value: string) => void;
  onFormSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPlayerSelect: (playerId: number) => void;
  onClearSelection: () => void;
}

const PlayerSelectionModal = ({
  isOpen,
  title,
  positionLabel,
  currentPlayerLabel,
  selectedPlayerId,
  players,
  formState,
  isSubmitting,
  isAssigning,
  onClose,
  onFormChange,
  onFormSubmit,
  onPlayerSelect,
  onClearSelection,
}: PlayerSelectionModalProps) => {
  if (!isOpen) {
    return null;
  }

  const canClear = Boolean(selectedPlayerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
            {positionLabel ? (
              <p className="text-xs text-slate-400">
                {positionLabel} に割り当てる選手を選択してください。
              </p>
            ) : null}
            {currentPlayerLabel ? (
              <p className="text-xs text-slate-500">
                現在: {currentPlayerLabel}
              </p>
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

        <div className="grid gap-6 px-6 py-6 sm:grid-cols-[2fr_1fr]">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">
              登録済み選手
            </h3>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-2">
              {players.length === 0 ? (
                <p className="text-sm text-slate-500">
                  選手が登録されていません。右側のフォームから追加してください。
                </p>
              ) : (
                players.map(player => {
                  const label = formatPlayerListLabel(
                    player,
                    positionLabel ?? 'ポジション'
                  );
                  const isSelected = player.id === selectedPlayerId;

                  return (
                    <button
                      key={player.id}
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-left text-sm text-slate-100 transition hover:border-sky-500/70 hover:bg-slate-900/70',
                        isSelected &&
                          'border-sky-400/80 bg-sky-400/10 text-sky-200'
                      )}
                      onClick={() =>
                        player.id && !isAssigning
                          ? onPlayerSelect(player.id)
                          : undefined
                      }
                      disabled={!player.id || isAssigning}
                    >
                      <span>{label}</span>
                      {isSelected ? <Check className="h-4 w-4" /> : null}
                    </button>
                  );
                })
              )}
            </div>
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

export const SetupTab = ({
  match,
  teamNameById,
  currentFormation,
  resolvedPlayers,
}: SetupTabProps) => {
  const [formState, setFormState] = useState<PlayerFormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const effectiveFormation = currentFormation ?? DEFAULT_FORMATION;

  const { formationSlots, homeFormationPlayers } = useFormationPlayers({
    match,
    formation: effectiveFormation,
    resolvedPlayers,
  });

  const {
    isSelectorOpen,
    selectedTarget,
    selectorTitle,
    handlePositionClick,
    handleSelectorChange,
  } = useFormationSelection({ formationSlots });

  const { getAssignedPlayerId, getAssignedPlayer, assignPlayer, clearPlayer } =
    useFormationAssignments({
      match,
      formationSlots,
      resolvedPlayers,
    });

  const teamPlayers = useTeamPlayers(match.team1Id);

  const homeTeamName = useMemo(
    () => teamNameById.get(match.team1Id) ?? `Team #${match.team1Id}`,
    [match.team1Id, teamNameById]
  );

  const selectedPlayerId =
    selectedTarget?.type === 'player'
      ? getAssignedPlayerId(selectedTarget.positionId)
      : undefined;

  const currentPlayer =
    selectedTarget?.type === 'player'
      ? getAssignedPlayer(selectedTarget.positionId)
      : undefined;

  const currentPlayerLabel = currentPlayer
    ? formatPlayerListLabel(
        currentPlayer,
        selectedTarget?.type === 'player' ? selectedTarget.positionLabel : ''
      )
    : undefined;

  const handlePlayerSelect = async (playerId: number) => {
    if (!selectedTarget || selectedTarget.type !== 'player') {
      return;
    }

    setIsAssigning(true);
    try {
      await assignPlayer(selectedTarget.positionId, playerId);
      toast.success('選手を割り当てました');
      handleSelectorChange(false);
    } catch (_error) {
      // エラー通知はフック内で処理済み
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClearSelection = async () => {
    if (!selectedTarget || selectedTarget.type !== 'player') {
      return;
    }

    setIsAssigning(true);
    try {
      await clearPlayer(selectedTarget.positionId);
      toast.success('割り当てをクリアしました');
      handleSelectorChange(false);
    } catch (_error) {
      // エラー通知はフック内で処理済み
    } finally {
      setIsAssigning(false);
    }
  };

  const handleFormChange = (field: keyof PlayerFormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = formState.name.trim();
    const trimmedNumber = formState.number.trim();
    const trimmedPosition = formState.position.trim();

    if (!trimmedName || !trimmedNumber) {
      toast.error('選手名と背番号を入力してください');
      return;
    }

    const parsedNumber = Number.parseInt(trimmedNumber, 10);
    if (!Number.isFinite(parsedNumber)) {
      toast.error('背番号は数値で入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      await db.temp_players.add({
        teamId: match.team1Id,
        name: trimmedName,
        number: parsedNumber,
        position: trimmedPosition,
      });
      toast.success('選手を登録しました');
      setFormState(INITIAL_FORM);
    } catch (error) {
      console.error('Failed to add player:', error);
      toast.error('選手の登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (typeof match.id !== 'number') {
    return null;
  }

  return (
    <>
      <Card className="border-slate-800/70 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-lg text-slate-100">
            {homeTeamName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 border-t border-slate-800/60 bg-slate-900/30">
          <div className="mx-auto w-full max-w-sm">
            <Pitch className="w-full max-w-sm" settings={defaultPitchSettings}>
              <Formation
                formationName={effectiveFormation}
                players={homeFormationPlayers}
                onPositionClick={handlePositionClick}
              />
            </Pitch>
          </div>
          <p className="text-center text-xs text-slate-500">
            ポジションを選択してスタメンを設定してください。
          </p>
        </CardContent>
      </Card>

      <PlayerSelectionModal
        isOpen={isSelectorOpen && selectedTarget?.type === 'player'}
        title={selectorTitle}
        positionLabel={
          selectedTarget?.type === 'player'
            ? selectedTarget.positionLabel
            : undefined
        }
        currentPlayerLabel={currentPlayerLabel}
        selectedPlayerId={selectedPlayerId}
        players={teamPlayers}
        formState={formState}
        isSubmitting={isSubmitting}
        isAssigning={isAssigning}
        onClose={() => handleSelectorChange(false)}
        onFormChange={handleFormChange}
        onFormSubmit={handleFormSubmit}
        onPlayerSelect={handlePlayerSelect}
        onClearSelection={handleClearSelection}
      />
    </>
  );
};
