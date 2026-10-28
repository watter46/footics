import { Check, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MergedSourcePlayer } from '../hooks/use-season-player-copy';

export interface CopySeasonPlayerGridProps {
  isLoading: boolean;
  fromSeason: string;
  mergedSourcePlayers: MergedSourcePlayer[];
  selectedPlayerIds: Set<number>;
  onTogglePlayer: (playerId: number) => void;
}

export function CopySeasonPlayerGrid({
  isLoading,
  fromSeason,
  mergedSourcePlayers,
  selectedPlayerIds,
  onTogglePlayer,
}: CopySeasonPlayerGridProps) {
  if (isLoading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-2 text-white/60">
        <Loader2 className="size-6 animate-spin text-accent-orange" />
        <span className="text-xs">
          Season {fromSeason} の選手データを読み込み中...
        </span>
      </div>
    );
  }

  if (mergedSourcePlayers.length === 0) {
    return (
      <div className="py-16 text-center text-white/40 text-xs font-medium">
        Season {fromSeason} に登録されている選手がいません。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {mergedSourcePlayers.map((player) => {
        const isSelected = selectedPlayerIds.has(player.playerId);
        return (
          <div
            key={player.playerId}
            onClick={() => onTogglePlayer(player.playerId)}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
              isSelected
                ? 'bg-accent-orange/15 border-accent-orange/50 text-white'
                : 'bg-surface-l1 hover:bg-surface-l2 border-white/[0.08] text-white/80'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-accent-orange text-white'
                    : 'border border-white/[0.1] bg-surface-l0'
                }`}
              >
                {isSelected && <Check className="size-3.5" />}
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-accent-orange">
                    #{player.shirtNo || '99'}
                  </span>
                  <span className="text-xs font-bold truncate">
                    {player.name}
                  </span>
                </div>
                <span className="text-[10px] text-white/60">
                  {player.position}
                </span>
              </div>
            </div>

            {player.isAlreadyInTarget && (
              <Badge
                variant="outline"
                className="bg-white/[0.04] text-white/60 border-white/[0.08] text-[9px] px-1.5 shrink-0"
              >
                登録済
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}
