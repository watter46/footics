'use client';

import { Edit3, Pencil } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { useMatchMemo } from '@/features/match';
import { cn } from '@/lib/utils';

interface MatchMemoDisplayProps {
  matchId: string;
  className?: string;
  onEdit?: () => void;
}

/**
 * MatchMemoDisplay - 試合全体のメモをタイムライン上に表示するコンポーネント
 */
export function MatchMemoDisplay({
  matchId,
  className,
  onEdit,
}: MatchMemoDisplayProps) {
  const { memo, isLoading } = useMatchMemo(matchId);

  if (isLoading) {
    return (
      <div
        className={cn(
          'animate-pulse h-20 bg-surface-l1/50 rounded-xl border border-white/[0.08] mb-6',
          className,
        )}
      />
    );
  }

  const hasMemo = memo && memo.trim().length > 0;

  return (
    <Card
      className={cn(
        'relative group overflow-hidden transition-all duration-300 mb-4 sm:mb-6',
        'bg-surface-l1/80 hover:bg-surface-l1 backdrop-blur-md',
        'border border-white/[0.08] hover:border-accent-orange/30 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg',
        className,
      )}
    >
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent-orange/5 blur-[60px] pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg flex gap-1 align-middle bg-accent-orange/10 border border-accent-orange/20">
              <Edit3 className="w-4 h-4 text-accent-orange" />
              <h3 className="text-xs sm:text-sm font-bold text-accent-orange tracking-wide uppercase">
                Memo
              </h3>
            </div>
          </div>
          {onEdit && (
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-accent-orange/10 text-white/60 hover:text-accent-orange transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              title="マッチメモを編集"
              aria-label="マッチメモを編集"
            >
              <Pencil className="w-3.5 h-3.5" />
            </IconButton>
          )}
        </div>

        {hasMemo ? (
          <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap pl-1">
            {memo}
          </p>
        ) : (
          <p
            className={cn(
              'text-sm italic pl-1 transition-colors',
              onEdit
                ? 'text-white/40 cursor-pointer hover:text-white/60'
                : 'text-white/40',
            )}
            onClick={onEdit}
          >
            No match memo added.{' '}
            {onEdit && (
              <span className="underline underline-offset-2">
                Click to add.
              </span>
            )}
          </p>
        )}
      </div>
    </Card>
  );
}
