import { Edit3, X } from 'lucide-react';
import type React from 'react';
import type {
  EventPhase,
  MemoMode,
} from '@/lib/features/MemoOverlay/memoOverlayLogic';

interface MemoOverlayHeaderProps {
  mode: MemoMode;
  phase: EventPhase;
  onClose: () => void;
}

export const MemoOverlayHeader: React.FC<MemoOverlayHeaderProps> = ({
  mode,
  phase,
  onClose,
}) => {
  return (
    <div className="flex-shrink-0 px-5 py-3 border-b border-slate-800/50 bg-slate-900/50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg ${
            mode === 'MATCH'
              ? 'bg-blue-500/10 text-blue-400'
              : 'bg-amber-500/10 text-amber-400'
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
        onClick={onClose}
        className="p-2 hover:bg-slate-800 rounded-lg text-slate-600 transition-all"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};
