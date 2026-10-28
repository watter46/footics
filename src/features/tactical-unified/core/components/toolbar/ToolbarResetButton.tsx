'use client';

import { RotateCcw } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';

export function ToolbarResetButton() {
  const setAnnotations = useCanvasStore((s) => s.setAnnotations);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const markers = useCanvasStore((s) => s.annotations.markers);

  const handleReset = () => {
    if (
      window.confirm(
        '矢印やゾーンなどの描画オブジェクトを消去しますか？（選手マーカーは保護されます）',
      )
    ) {
      setAnnotations({
        arrows: [],
        zones: [],
        texts: [],
        markers,
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
