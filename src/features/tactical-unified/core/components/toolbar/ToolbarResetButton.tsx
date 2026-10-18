'use client';

import { RotateCcw } from 'lucide-react';
import { useCanvasStore } from '../../hooks/use-canvas-store';

export function ToolbarResetButton() {
  const setAnnotations = useCanvasStore((s) => s.setAnnotations);
  const clearSelection = useCanvasStore((s) => s.clearSelection);

  const handleReset = () => {
    if (window.confirm('すべての描画オブジェクトを消去しますか？')) {
      setAnnotations({
        arrows: [],
        zones: [],
        texts: [],
        markers: [],
      });
      clearSelection();
    }
  };

  return (
    <button
      type="button"
      onClick={handleReset}
      title="Reset all annotations"
      aria-label="Reset annotations"
      className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-[#333333] transition-all cursor-pointer flex items-center justify-center shrink-0"
    >
      <RotateCcw size={16} />
    </button>
  );
}
