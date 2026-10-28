import { Edit3, X } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import type {
  EventPhase,
  MemoMode,
} from '@/lib/features/memo-overlay/memoOverlayLogic';

interface MemoOverlayHeaderProps {
  mode: MemoMode;
  phase: EventPhase;
  period: number;
  onClose: () => void;
}

const PERIOD_THEMES = {
  1: 'bg-indigo-500/10 text-indigo-400',
  2: 'bg-emerald-500/10 text-emerald-400',
  3: 'bg-rose-500/10 text-rose-400',
  4: 'bg-violet-500/10 text-violet-400',
  5: 'bg-fuchsia-500/10 text-fuchsia-400',
} as const;

export function MemoOverlayHeader({
  mode,
  phase,
  period,
  onClose,
}: MemoOverlayHeaderProps) {
  return (
    <div className="flex-shrink-0 px-5 py-3 border-b border-white/[0.08] bg-surface-l2/50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg transition-colors duration-500 ${
            mode === 'MATCH'
              ? 'bg-accent-orange/10 text-accent-orange'
              : PERIOD_THEMES[period as keyof typeof PERIOD_THEMES] ||
                'bg-accent-orange/10 text-accent-orange'
          }`}
        >
          <Edit3 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-black text-white uppercase tracking-tighter">
            {mode === 'MATCH' ? 'Match Insight' : 'Event'}
          </h2>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
            {mode === 'MATCH' ? 'Final Summary' : `Phase ${phase + 1} of 3`}
          </p>
        </div>
      </div>
      <IconButton
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClose}
        aria-label="Close"
        className="text-white/40 hover:text-white"
      >
        <X className="w-5 h-5" />
      </IconButton>
    </div>
  );
}
