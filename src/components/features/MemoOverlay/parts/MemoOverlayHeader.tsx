import { Edit3, X } from 'lucide-react';
import type React from 'react';
import type {
  EventPhase,
  MemoMode,
} from '@/lib/features/MemoOverlay/memoOverlayLogic';

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

export const MemoOverlayHeader: React.FC<MemoOverlayHeaderProps> = ({
  mode,
  phase,
  period,
  onClose,
}) => {
  return (
    <div className="flex-shrink-0 px-5 py-3 border-b border-slate-800/50 bg-slate-900/50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg transition-colors duration-500 ${
            mode === 'MATCH'
              ? 'bg-blue-500/10 text-blue-400'
              : PERIOD_THEMES[period as keyof typeof PERIOD_THEMES] ||
                'bg-amber-500/10 text-amber-400'
          }`}
        >
          <Edit3 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-tighter">
            {mode === 'MATCH' ? 'Match Insight' : 'Event'}
          </h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            {mode === 'MATCH' ? 'Final Summary' : `Phase ${phase + 1} of 3`}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-2 hover:bg-slate-800 rounded-lg text-slate-600 transition-all"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};
