/**
 * use-keyboard-shortcuts.ts
 * Keyboard shortcuts: Delete, Escape, Backspace, Copy (Mod+C), Paste (Mod+V), Duplicate (Mod+D), Tool switching, Tab (Workspace Mode), Space (Playback), Undo/Redo
 */

import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { getToolShortcutMap } from '@/features/tactical-unified/core/components/toolbar';
import type { SelectedObject } from '@/features/tactical-unified/core/types';
import {
  handleCopyObjects,
  handleDeleteOrBackspace,
  handleDuplicateObjects,
  handleDuplicateScene,
  handleEscapeKey,
  handleNavigateScene,
  handlePasteObjects,
  handleRestartPlayback,
} from '@/features/tactical-unified/hooks/keyboard-shortcut-handlers';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { useTacticalStoresContext } from '@/features/tactical-unified/stores/tactical-store-provider';
import { isInputFocused } from '@/lib/shortcuts';

export function useKeyboardShortcuts() {
  const stores = useTacticalStoresContext();
  const { documentStore, sessionStore, playbackStore } = stores;

  // Undo: Mod+Z (Ctrl+Z / Cmd+Z)
  useHotkeys(
    ['mod+z', 'meta+z'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      documentStore.getState().undo();
    },
    { enableOnFormTags: false },
  );

  // Redo: Mod+Shift+Z / Mod+Y (Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y / Cmd+Y)
  useHotkeys(
    ['mod+shift+z', 'meta+shift+z', 'mod+y', 'meta+y'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      documentStore.getState().redo();
    },
    { enableOnFormTags: false },
  );

  // Copy: Mod+C (Ctrl+C / Cmd+C)
  useHotkeys(
    ['mod+c', 'meta+c'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      handleCopyObjects(stores);
    },
    { enableOnFormTags: false },
  );

  // Paste: Mod+V (Ctrl+V / Cmd+V)
  useHotkeys(
    ['mod+v', 'meta+v'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      handlePasteObjects(stores);
    },
    { enableOnFormTags: false },
  );

  // Duplicate: Mod+D (Ctrl+D / Cmd+D)
  useHotkeys(
    ['mod+d', 'meta+d'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      handleDuplicateObjects(stores);
    },
    { enableOnFormTags: false },
  );

  // Duplicate Scene: Mod+M (Ctrl+M / Cmd+M)
  useHotkeys(
    ['mod+m', 'meta+m'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      handleDuplicateScene(stores);
    },
    { enableOnFormTags: false },
  );

  // Select All: Mod+A (Ctrl+A / Cmd+A)
  useHotkeys(
    ['mod+a', 'meta+a'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const { project } = documentStore.getState();
      const { activePhaseId, activeSlideId } = sessionStore.getState();
      const activeSlide = selectDomainActiveSlide(
        project,
        activePhaseId,
        activeSlideId,
      );
      if (!activeSlide) return;
      const all: SelectedObject[] = [
        ...activeSlide.arrows.map((a) => ({
          id: a.id,
          kind: 'arrow' as const,
        })),
        ...activeSlide.zones.map((z) => ({ id: z.id, kind: 'zone' as const })),
        ...activeSlide.texts.map((t) => ({ id: t.id, kind: 'text' as const })),
        ...activeSlide.players.map((p) => ({
          id: p.id,
          kind: 'player' as const,
        })),
      ];
      sessionStore.getState().selectObjects(all);
    },
    { enableOnFormTags: false },
  );

  // Playback: Space
  useHotkeys(
    'space',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      playbackStore.getState().togglePlayback();
    },
    { enableOnFormTags: false },
  );

  // Workspace mode: Tab (Board <-> Director)
  useHotkeys(
    'tab',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      sessionStore.getState().toggleWorkspaceMode();
    },
    { enableOnFormTags: false },
  );

  // Previous Scene: D
  useHotkeys(
    'd',
    (e) => {
      if (isInputFocused()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      handleNavigateScene(stores, 'prev');
    },
    { enableOnFormTags: false },
  );

  // Next Scene: F
  useHotkeys(
    'f',
    (e) => {
      if (isInputFocused()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      handleNavigateScene(stores, 'next');
    },
    { enableOnFormTags: false },
  );

  // Restart & Play: R
  useHotkeys(
    'r',
    (e) => {
      if (isInputFocused()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      handleRestartPlayback(stores);
    },
    { enableOnFormTags: false },
  );

  // Escape: 段階的キャンセル (① blur -> ② clearSelection -> ③ setRightPanelOpen(false))
  useHotkeys(
    'escape',
    (e) => {
      handleEscapeKey(stores, e);
    },
    { enableOnFormTags: true },
  );

  // Right panel toggle: Mod+] (Ctrl+] / Cmd+])
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      if (e.key === ']' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const session = sessionStore.getState();
        const nextOpen = !session.panels.isRightPanelOpen;
        session.setRightPanelOpen(nextOpen);
        if (!nextOpen) {
          (document.activeElement as HTMLElement)?.blur();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sessionStore]);

  // Tools: registered shortcuts
  const shortcutMap = getToolShortcutMap();
  const toolShortcutKeys = Object.keys(shortcutMap);

  useHotkeys(
    toolShortcutKeys,
    (e) => {
      if (isInputFocused()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const currentMap = getToolShortcutMap();
      const tool = currentMap[e.key.toLowerCase()];
      if (tool) {
        e.preventDefault();
        sessionStore.getState().setActiveTool(tool);
      }
    },
    { enableOnFormTags: false },
  );

  // Delete / Backspace: Remove selected objects or slide
  useHotkeys(
    ['delete', 'backspace'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      handleDeleteOrBackspace(stores);
    },
    { enableOnFormTags: false },
  );
}
