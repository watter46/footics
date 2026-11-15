'use client';

import { RotateCcw } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';

export function ToolbarResetButton() {
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const clearSelection = useSessionStore((s) => s.clearSelection);

  const handleReset = () => {
    if (
      window.confirm(
        '矢印やゾーンなどの描画オブジェクトを消去しますか？（選手マーカーは保護されます）',
      )
    ) {
      dispatchSlide(activePhaseId, activeSlideId, {
        type: 'RESET_SLIDE_OBJECTS',
      });
      clearSelection();
    }
  };

  return (
    <IconButton
      onClick={handleReset}
      variant="ghost"
      size="sm"
      title="Reset all annotations"
      aria-label="Reset all slide objects"
      className="shrink-0 text-white/40 hover:text-rose-400 hover:bg-rose-500/10"
    >
      <RotateCcw size={16} />
    </IconButton>
  );
}
