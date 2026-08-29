'use client';

/**
 * use-keyboard-shortcuts.ts
 * Keyboard shortcuts: Delete, Escape, Backspace
 */

import { useEffect } from 'react';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';

export function useKeyboardShortcuts() {
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const clearSelection = useTacticalUnifiedStore((s) => s.clearSelection);
  const removePlayer = useTacticalUnifiedStore((s) => s.removePlayer);
  const removeArrow = useTacticalUnifiedStore((s) => s.removeArrow);
  const removeZone = useTacticalUnifiedStore((s) => s.removeZone);
  const removeText = useTacticalUnifiedStore((s) => s.removeText);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const setActiveTool = useTacticalUnifiedStore((s) => s.setActiveTool);
  const togglePlayback = useTacticalUnifiedStore((s) => s.togglePlayback);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      // input/textarea にフォーカス中はスキップ
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayback();
        return;
      }

      if (e.key === 'Escape') {
        clearSelection();
        return;
      }

      if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
        return;
      }
      if (e.key === 'l' || e.key === 'L') {
        setActiveTool('line');
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        setActiveTool('route_line');
        return;
      }
      if (e.key === 'a' || e.key === 'A') {
        setActiveTool('arrow_solid');
        return;
      }
      if (e.key === 'd' || e.key === 'D') {
        setActiveTool('arrow_dash');
        return;
      }
      if (e.key === 'z' || e.key === 'Z') {
        setActiveTool('zone_circle');
        return;
      }
      if (e.key === 'p' || e.key === 'P') {
        setActiveTool('polygon_zone');
        return;
      }
      if (e.key === 't' || e.key === 'T') {
        setActiveTool('text');
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        setActiveTool('eraser');
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        for (const obj of selectedObjects) {
          switch (obj.kind) {
            case 'player':
              removePlayer(activeSlideId, obj.id);
              break;
            case 'arrow':
              removeArrow(activeSlideId, obj.id);
              break;
            case 'zone':
              removeZone(activeSlideId, obj.id);
              break;
            case 'text':
              removeText(activeSlideId, obj.id);
              break;
          }
        }
        clearSelection();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    selectedObjects,
    clearSelection,
    removePlayer,
    removeArrow,
    removeZone,
    removeText,
    activeSlideId,
    setActiveTool,
    togglePlayback,
  ]);
}
