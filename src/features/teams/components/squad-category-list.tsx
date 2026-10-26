'use client';

import { type MergedSquadPlayer, SquadPlayerCard } from './squad-player-card';
import type { PositionCategory } from './squad-stats-summary';

export interface SquadCategoryListProps {
  positionCategories: readonly PositionCategory[];
  playersByCategory: Record<string, MergedSquadPlayer[]>;
  selectedSeason: string;
  onEdit: (player: MergedSquadPlayer) => void;
  onDelete: (player: MergedSquadPlayer) => void;
  onPhotoUpload: (playerId: number, blob: Blob, name: string) => Promise<void>;
  onPhotoDelete: (playerId: number) => Promise<void>;
}

export function SquadCategoryList({
  positionCategories,
  playersByCategory,
  selectedSeason,
  onEdit,
  onDelete,
  onPhotoUpload,
  onPhotoDelete,
}: SquadCategoryListProps) {
  return (
    <div className="space-y-8">
      {positionCategories.map((cat) => {
        const list = playersByCategory[cat.key] || [];
        if (list.length === 0) return null;

        return (
          <div key={cat.key} className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-blue-400 tracking-wider">
                  {cat.key}
                </span>
                <span className="text-sm font-bold text-slate-200">
                  {cat.label}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {list.length} players
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {list.map((player) => (
                <SquadPlayerCard
                  key={player.playerId}
                  player={player}
                  selectedSeason={selectedSeason}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPhotoUpload={(blob) =>
                    onPhotoUpload(player.playerId, blob, player.name)
                  }
                  onPhotoDelete={
                    player.photoBlob || player.photoUrl
                      ? () => onPhotoDelete(player.playerId)
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
