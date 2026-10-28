'use client';

import { Loader2, Save } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog';
import { usePlayerMasterMutations } from '@/features/teams/hooks/use-player-master';
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

export function EditPlayerDialog({
  isOpen,
  onClose,
  player,
  availableOfficialPlayers = [],
  onSuccess,
}: EditPlayerDialogProps) {
  const { updatePlayer } = usePlayerMasterMutations();
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
      await updatePlayer({
        playerId: player.playerId,
        name: trimmed,
        defaultShirtNo: typeof shirtNo === 'number' ? shirtNo : 99,
        position,
        season: player.season,
        teamName: player.teamName || 'Chelsea',
        updatedAt: Date.now(),
      });

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
    ? 'bg-accent-orange/15 border-accent-orange/40 text-[#FFA336] text-[10px]'
    : 'bg-white/[0.04] border-white/[0.08] text-white/60 text-[10px]';

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-accent-orange shadow-[0_0_6px_#FF8100] shrink-0" />
          <span className="text-sm font-bold text-white">選手情報の編集</span>
          <Badge variant="outline" className={badgeCls}>
            {isTemporaryPlayer
              ? '手動登録 (仮ID)'
              : `WhoScored ID: ${player.playerId}`}
          </Badge>
        </div>
      </DialogHeader>

      <form id="edit-player-form" onSubmit={handleSubmit}>
        <DialogContent className="space-y-6 max-h-[70vh] overflow-y-auto p-0">
          <PlayerBasicFormFields
            name={name}
            shirtNo={shirtNo}
            position={position}
            onNameChange={setName}
            onShirtNoChange={setShirtNo}
            onPositionChange={setPosition}
          />

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
        </DialogContent>

        <DialogFooter className="mt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            <span>保存する</span>
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
