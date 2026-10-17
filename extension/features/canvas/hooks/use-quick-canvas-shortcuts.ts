import type React from 'react';
import { useEffect } from 'react';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core';

export function useQuickCanvasShortcuts(
  canvasRef: React.RefObject<CanvasCoreHandle | null>,
): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          canvasRef.current?.redo();
        } else {
          canvasRef.current?.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        canvasRef.current?.redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasRef]);
}
