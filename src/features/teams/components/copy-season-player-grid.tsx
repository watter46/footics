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
      <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="text-xs">
          Season {fromSeason} の選手データを読み込み中...
        </span>
      </div>
    );
  }

  if (mergedSourcePlayers.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs font-medium">
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
                ? 'bg-blue-600/15 border-blue-500/50 text-slate-100'
                : 'bg-slate-950/40 hover:bg-slate-800/60 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-700 bg-slate-900'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-blue-400">
                    #{player.shirtNo || '99'}
                  </span>
                  <span className="text-xs font-bold truncate">
                    {player.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {player.position}
                </span>
              </div>
            </div>

            {player.isAlreadyInTarget && (
              <Badge
                variant="outline"
                className="bg-slate-800 text-slate-400 border-slate-700 text-[9px] px-1.5 shrink-0"
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
