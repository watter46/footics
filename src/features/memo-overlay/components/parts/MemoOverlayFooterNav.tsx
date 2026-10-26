import { ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';

interface MemoOverlayFooterNavProps {
  phase: number;
  isSaving: boolean;
  onPrevPhase: () => void;
  onNextPhase: () => void;
  onSave: () => void;
}

export function MemoOverlayFooterNav({
  phase,
  isSaving,
  onPrevPhase,
  onNextPhase,
  onSave,
}: MemoOverlayFooterNavProps) {
  return (
    <div className="flex-shrink-0 px-5 py-4 bg-slate-950/30 border-t border-slate-800/50 flex justify-between items-center">
      <div className="flex gap-3">
        {phase > 0 && (
          <button
            type="button"
            onClick={onPrevPhase}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-slate-100 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> BACK
          </button>
        )}
      </div>
      <div className="flex gap-2">
        {phase < 2 ? (
          <button
            type="button"
            onClick={onNextPhase}
            className="flex items-center gap-1.5 px-5 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-black text-slate-100 transition-all shadow-xl"
          >
            NEXT <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-black transition-all shadow-xl shadow-amber-900/20"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            PERSIST EVENT
          </button>
        )}
      </div>
    </div>
  );
}
