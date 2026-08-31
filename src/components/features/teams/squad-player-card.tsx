'use client';

import { Edit3, Trash2 } from 'lucide-react';
import type React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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

export const SquadPlayerCard: React.FC<SquadPlayerCardProps> = ({
  player,
  selectedSeason,
  onEdit,
  onDelete,
  onPhotoUpload,
  onPhotoDelete,
}) => {
  return (
    <Card
      onClick={() => onEdit(player)}
      className="bg-slate-900/60 hover:bg-slate-900/90 border-slate-800/80 hover:border-blue-500/50 rounded-2xl p-4 transition-all shadow-md group relative flex items-center justify-between gap-3.5 cursor-pointer hover:shadow-blue-500/5"
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
            <span className="font-mono text-xs font-black text-blue-400">
              #{player.shirtNo || '99'}
            </span>
            <Badge
              variant="outline"
              className="px-1.5 py-0 text-[9px] font-bold uppercase bg-slate-800 text-slate-300 border-slate-700"
            >
              {player.position}
            </Badge>
            {player.playerId > 0 ? (
              <Badge
                variant="outline"
                className="px-1.5 py-0 text-[9px] font-mono font-semibold bg-blue-600/10 text-blue-400 border-blue-500/30"
                title={`WhoScored 登録選手 (ID: ${player.playerId})`}
              >
                ID: {player.playerId}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="px-1.5 py-0 text-[9px] font-semibold bg-amber-500/15 text-amber-300 border-amber-500/40"
                title="WhoScored未登録の手動追加選手です。クリックしてWhoScored IDを紐付けできます。"
              >
                ID未登録 (手動)
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 min-w-0">
            <span
              className="text-sm font-bold text-slate-100 truncate group-hover:text-blue-300 transition-colors"
              title={player.name}
            >
              {player.name}
            </span>
            <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-blue-400 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Season {selectedSeason}
          </span>
        </div>
      </div>

      {/* Action Menu (Edit & Delete) */}
      <div
        className="flex items-center gap-1 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onEdit(player)}
          title={`${player.name} の情報を編集`}
          className="p-2 bg-slate-800/60 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 rounded-xl transition-all border border-slate-700/50 hover:border-blue-500/40"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(player)}
          title={`${player.name} を削除`}
          className="p-2 bg-slate-800/60 hover:bg-red-600/20 text-slate-400 hover:text-red-400 rounded-xl transition-all border border-slate-700/50 hover:border-red-500/40 opacity-50 group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
};
