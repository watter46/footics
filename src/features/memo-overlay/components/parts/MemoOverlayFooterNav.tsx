import { ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="flex-shrink-0 px-5 py-4 bg-surface-l2/50 border-t border-white/[0.08] flex justify-between items-center">
      <div className="flex gap-3">
        {phase > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onPrevPhase}
            className="flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" /> BACK
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        {phase < 2 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onNextPhase}
            className="flex items-center gap-1.5 px-5 font-black text-xs text-white shadow-xl"
          >
            NEXT <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 font-black text-xs text-white shadow-xl"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            PERSIST EVENT
          </Button>
        )}
      </div>
    </div>
  );
}
