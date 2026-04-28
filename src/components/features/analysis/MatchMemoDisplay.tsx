'use client';

import { Edit3 } from 'lucide-react';
import { useMatchMemo } from '@/hooks/use-match-memo';
import { cn } from '@/lib/utils';

interface MatchMemoDisplayProps {
  matchId: string;
  className?: string;
}

/**
 * MatchMemoDisplay - 試合全体のメモをタイムライン上に表示するコンポーネント
 */
export function MatchMemoDisplay({
  matchId,
  className,
}: MatchMemoDisplayProps) {
  const { memo, isLoading } = useMatchMemo(matchId);

  if (isLoading) {
    return (
      <div
        className={cn(
          'animate-pulse h-20 bg-slate-900/50 rounded-xl border border-slate-800/60 mb-6',
          className,
        )}
      />
    );
  }

  const hasMemo = memo && memo.trim().length > 0;

  return (
    <div
      className={cn(
        'relative group overflow-hidden transition-all duration-300 mb-6',
        'bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md',
        'border border-slate-800/60 hover:border-blue-500/30 rounded-2xl p-5 shadow-lg',
        className,
      )}
    >
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg flex gap-1 align-middle bg-amber-500/10 border border-amber-500/20">
              <Edit3 className="w-4 h-4 text-amber-400" />

              <h3 className="text-sm font-bold text-amber-400 tracking-wide uppercase">
                Memo
              </h3>
            </div>
          </div>
        </div>

        {hasMemo ? (
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap pl-1">
            {memo}
          </p>
        ) : (
          <p className="text-slate-500 text-sm italic pl-1">
            No match memo added. Add some general notes about the game context
            here.
          </p>
        )}
      </div>
    </div>
  );
}
