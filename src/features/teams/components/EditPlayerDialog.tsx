'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Edit3, Loader2, Save, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { savePlayerMaster } from '@/lib/db/queries';
import { playerKeys } from '@/lib/query-keys';
import { normalizePosition } from '@/lib/tactical/player-formatting';
import type { Player, StandardPosition } from '@/types';
import { PlayerBasicFormFields } from './player-basic-form-fields';
import {
  type OfficialPlayerOption,
  PlayerWhoScoredLinkSection,
} from './player-whoscored-link-section';

export interface EditablePlayerData {
  playerId: number;
  name: string;
  shirtNo?: number;
  position?: Player['position'];
  season: string;
  teamName?: string;
}

export type { OfficialPlayerOption };

export interface EditPlayerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  player: EditablePlayerData | null;
  availableOfficialPlayers?: OfficialPlayerOption[];
  onSuccess: () => void;
}

const cCancel =
  'px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors';
const cSubmit =
  'h-9 px-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl gap-2 shadow-lg shadow-blue-600/25 flex items-center justify-center transition-colors';

export function EditPlayerDialog({
  isOpen,
  onClose,
  player,
  availableOfficialPlayers = [],
  onSuccess,
}: EditPlayerDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [shirtNo, setShirtNo] = useState<number | ''>('');
  const [position, setPosition] = useState<StandardPosition>('Other');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTemporaryPlayer = Boolean(player && player.playerId < 0);

  useEffect(() => {
    if (player) {
      setName(player.name || '');
      setShirtNo(typeof player.shirtNo === 'number' ? player.shirtNo : '');
      setPosition(normalizePosition(player.position));
    }
  }, [player]);

  if (!isOpen || !player) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return toast.error('選手名を入力してください');

    try {
      setIsSubmitting(true);
      await savePlayerMaster({
        playerId: player.playerId,
        name: trimmed,
        defaultShirtNo: typeof shirtNo === 'number' ? shirtNo : 99,
        position,
        season: player.season,
        teamName: player.teamName || 'Chelsea',
        updatedAt: Date.now(),
      });

      const keys = [
        ['season-players', player.season],
        playerKeys.all,
        ['chelsea-squad'],
        ['team-squad'],
      ];
      await Promise.all(
        keys.map((k) => queryClient.invalidateQueries({ queryKey: k })),
      );

      toast.success(`${trimmed} の情報を更新しました`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const badgeCls = isTemporaryPlayer
    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 text-[10px]'
    : 'bg-blue-600/10 border-blue-500/30 text-blue-400 text-[10px]';

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5 text-slate-100 font-bold text-base">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span>選手情報の編集</span>
                <Badge variant="outline" className={badgeCls}>
                  {isTemporaryPlayer
                    ? '手動登録 (仮ID)'
                    : `WhoScored ID: ${player.playerId}`}
                </Badge>
              </div>
              <span className="text-xs text-slate-400 font-normal block">
                Season {player.season} の登録情報を変更します
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <form
            id="edit-player-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <PlayerBasicFormFields
              name={name}
              shirtNo={shirtNo}
              position={position}
              onNameChange={setName}
              onShirtNoChange={setShirtNo}
              onPositionChange={setPosition}
            />
          </form>

          {isTemporaryPlayer && (
            <PlayerWhoScoredLinkSection
              playerId={player.playerId}
              season={player.season}
              playerName={name}
              teamName={player.teamName}
              availableOfficialPlayers={availableOfficialPlayers}
              onMergeSuccess={() => {
                onSuccess();
                onClose();
              }}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/60 shrink-0">
          <button type="button" onClick={onClose} className={cCancel}>
            キャンセル
          </button>
          <Button
            type="submit"
            form="edit-player-form"
            disabled={isSubmitting}
            className={cSubmit}
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>保存する</span>
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
