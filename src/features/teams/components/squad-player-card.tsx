'use client';

import { Edit3, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import {
  PositionBadge,
  type PositionType,
} from '@/components/ui/position-badge';
import type { Player } from '@/types';
import { PlayerPhoto } from './PlayerPhoto';

export interface MergedSquadPlayer extends Player {
  photoBlob?: Blob;
  photoUrl?: string;
}

export interface SquadPlayerCardProps {
  player: MergedSquadPlayer;
  selectedSeason: string;
  onEdit: (player: MergedSquadPlayer) => void;
  onDelete: (player: MergedSquadPlayer) => void;
  onPhotoUpload: (blob: Blob) => Promise<void>;
  onPhotoDelete?: () => Promise<void>;
}

export function SquadPlayerCard({
  player,
  selectedSeason,
  onEdit,
  onDelete,
  onPhotoUpload,
  onPhotoDelete,
}: SquadPlayerCardProps) {
  const badgePos =
    (player.position as string) === 'MF'
      ? 'MID'
      : (player.position as PositionType);

  return (
    <Card
      interactive
      onClick={() => onEdit(player)}
      className="p-4 flex flex-row items-center justify-between gap-3.5 group relative"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Player Photo with Upload/Delete Support */}
        <div onClick={(e) => e.stopPropagation()}>
          <PlayerPhoto
            photoBlob={player.photoBlob}
            photoUrl={player.photoUrl}
            name={player.name}
            shirtNo={player.shirtNo}
            onPhotoUpload={onPhotoUpload}
            onPhotoDelete={
              player.photoBlob || player.photoUrl ? onPhotoDelete : undefined
            }
            size="md"
          />
        </div>

        {/* Player Details */}
        <div className="min-w-0 flex flex-col">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-accent-orange">
              #{player.shirtNo || '99'}
            </span>
            <PositionBadge
              position={badgePos}
              label={player.position}
              variant="compact"
            />
            {player.playerId > 0 ? (
              <Badge
                variant="outline"
                className="px-1.5 py-0 text-[9px] font-mono font-semibold bg-white/[0.04] text-white/60 border-white/[0.08]"
                title={`WhoScored 登録選手 (ID: ${player.playerId})`}
              >
                ID: {player.playerId}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="px-1.5 py-0 text-[9px] font-semibold bg-accent-orange/15 text-[#FFA336] border-accent-orange/40"
                title="WhoScored未登録の手動追加選手です。クリックしてWhoScored IDを紐付けできます。"
              >
                ID未登録 (手動)
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 min-w-0">
            <span
              className="text-sm font-bold text-white truncate group-hover:text-accent-orange transition-colors"
              title={player.name}
            >
              {player.name}
            </span>
            <Edit3 className="size-3 text-white/40 group-hover:text-accent-orange shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-[10px] text-white/40 font-medium">
            Season {selectedSeason}
          </span>
        </div>
      </div>

      {/* Action Menu (Edit & Delete) */}
      <div
        className="flex items-center gap-1 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton
          variant="ghost"
          size="sm"
          onClick={() => onEdit(player)}
          title={`${player.name} の情報を編集`}
          className="text-white/60 hover:text-white"
        >
          <Edit3 className="size-4" />
        </IconButton>
        <IconButton
          variant="ghost"
          size="sm"
          onClick={() => onDelete(player)}
          title={`${player.name} を削除`}
          className="text-white/40 hover:text-red-400 opacity-60 group-hover:opacity-100"
        >
          <Trash2 className="size-4" />
        </IconButton>
      </div>
    </Card>
  );
}
