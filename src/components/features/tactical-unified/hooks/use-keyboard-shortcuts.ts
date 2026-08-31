'use client';

/**
 * use-keyboard-shortcuts.ts
 * Keyboard shortcuts: Delete, Escape, Backspace, Copy (Ctrl/Cmd+C), Paste (Ctrl/Cmd+V), Duplicate (Ctrl/Cmd+D), Tool switching
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
  const copySelectedObjects = useTacticalUnifiedStore(
    (s) => s.copySelectedObjects,
  );
  const pasteObjects = useTacticalUnifiedStore((s) => s.pasteObjects);
  const duplicateSelectedObjects = useTacticalUnifiedStore(
    (s) => s.duplicateSelectedObjects,
  );
  const undo = useTacticalUnifiedStore((s) => s.undo);
  const redo = useTacticalUnifiedStore((s) => s.redo);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const setActiveTool = useTacticalUnifiedStore((s) => s.setActiveTool);
  const togglePlayback = useTacticalUnifiedStore((s) => s.togglePlayback);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      // input/textarea/contenteditable にフォーカス中はスキップ
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      // Ctrl / Cmd コマンド (Undo, Redo, Copy & Paste)
      if (e.ctrlKey || e.metaKey) {
        // Redo: Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y (Windows/Linux)
        if (
          (e.shiftKey && (e.key === 'z' || e.key === 'Z')) ||
          e.key === 'y' ||
          e.key === 'Y'
        ) {
          e.preventDefault();
          redo();
          return;
        }

        // Undo: Ctrl+Z / Cmd+Z
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          undo();
          return;
        }

        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          copySelectedObjects(activeSlideId);
          return;
        }
        if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          pasteObjects(activeSlideId);
          return;
        }
        if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          duplicateSelectedObjects(activeSlideId);
          return;
        }
        // 他の修飾キー付きショートカットの場合は単独キー処理へ流さない
        return;
      }

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
    copySelectedObjects,
    pasteObjects,
    duplicateSelectedObjects,
    undo,
    redo,
    activeSlideId,
    setActiveTool,
    togglePlayback,
  ]);
}
