'use client';

import { RotateCcw } from 'lucide-react';
import { useCanvasStore } from '../../hooks/use-canvas-store';

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
    <button
      type="button"
      onClick={handleReset}
      title="Reset all annotations"
      aria-label="Reset all slide objects"
      className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-[#333333] transition-all cursor-pointer flex items-center justify-center shrink-0"
    >
      <RotateCcw size={16} />
    </button>
  );
}
