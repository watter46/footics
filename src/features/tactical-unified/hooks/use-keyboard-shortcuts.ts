'use client';

/**
 * use-keyboard-shortcuts.ts
 * Keyboard shortcuts: Delete, Escape, Backspace, Copy (Mod+C), Paste (Mod+V), Duplicate (Mod+D), Tool switching, Space (Playback), Undo/Redo
 */

import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { isInputFocused } from '@/lib/shortcuts';
import type { DrawingTool } from '@/lib/types/tactical-unified';

const TOOL_KEYS: Record<string, DrawingTool> = {
  v: 'select',
  l: 'line',
  r: 'route_line',
  a: 'arrow_solid',
  d: 'arrow_dash',
  w: 'arrow_wavy',
  z: 'zone_circle',
  p: 'polygon_zone',
  t: 'text',
  m: 'player',
  o: 'player-ring',
  e: 'eraser',
};

const TOOL_SHORTCUT_KEYS = Object.keys(TOOL_KEYS);

export function useKeyboardShortcuts() {
  // Undo: Mod+Z (Ctrl+Z / Cmd+Z)
  useHotkeys(
    ['mod+z', 'meta+z'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      useTacticalUnifiedStore.getState().undo();
    },
    { enableOnFormTags: false },
  );

  // Redo: Mod+Shift+Z / Mod+Y (Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y / Cmd+Y)
  useHotkeys(
    ['mod+shift+z', 'meta+shift+z', 'mod+y', 'meta+y'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      useTacticalUnifiedStore.getState().redo();
    },
    { enableOnFormTags: false },
  );

  // Copy: Mod+C (Ctrl+C / Cmd+C)
  useHotkeys(
    ['mod+c', 'meta+c'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const currentSlideId = useTacticalUnifiedStore.getState().activeSlideId;
      useTacticalUnifiedStore.getState().copySelectedObjects(currentSlideId);
    },
    { enableOnFormTags: false },
  );

  // Paste: Mod+V (Ctrl+V / Cmd+V)
  useHotkeys(
    ['mod+v', 'meta+v'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const currentSlideId = useTacticalUnifiedStore.getState().activeSlideId;
      useTacticalUnifiedStore.getState().pasteObjects(currentSlideId);
    },
    { enableOnFormTags: false },
  );

  // Duplicate: Mod+D (Ctrl+D / Cmd+D)
  useHotkeys(
    ['mod+d', 'meta+d'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const currentSlideId = useTacticalUnifiedStore.getState().activeSlideId;
      useTacticalUnifiedStore
        .getState()
        .duplicateSelectedObjects(currentSlideId);
    },
    { enableOnFormTags: false },
  );

  // Playback: Space
  useHotkeys(
    'space',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      useTacticalUnifiedStore.getState().togglePlayback();
    },
    { enableOnFormTags: false },
  );

  // Escape: Clear selection
  useHotkeys(
    'escape',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      useTacticalUnifiedStore.getState().clearSelection();
    },
    { enableOnFormTags: false },
  );

  // Tools: v, l, r, a, d, w, z, p, t, m, o, e
  useHotkeys(
    TOOL_SHORTCUT_KEYS,
    (e) => {
      if (isInputFocused()) return;
      const tool = TOOL_KEYS[e.key.toLowerCase()];
      if (tool) {
        e.preventDefault();
        useTacticalUnifiedStore.getState().setActiveTool(tool);
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
      const store = useTacticalUnifiedStore.getState();
      const currentSlideId = store.activeSlideId;
      const currentSelected = store.selectedObjects;

      if (currentSelected.length > 0) {
        const slide = store.project.slides.find((s) => s.id === currentSlideId);
        let hasLockedObject = false;

        for (const obj of currentSelected) {
          let isLocked = false;
          switch (obj.kind) {
            case 'player':
              isLocked = Boolean(
                slide?.players.find((p) => p.id === obj.id)?.locked,
              );
              if (!isLocked) store.removePlayer(currentSlideId, obj.id);
              break;
            case 'arrow':
              isLocked = Boolean(
                slide?.arrows.find((a) => a.id === obj.id)?.locked,
              );
              if (!isLocked) store.removeArrow(currentSlideId, obj.id);
              break;
            case 'zone':
              isLocked = Boolean(
                slide?.zones.find((z) => z.id === obj.id)?.locked,
              );
              if (!isLocked) store.removeZone(currentSlideId, obj.id);
              break;
            case 'text':
              isLocked = Boolean(
                slide?.texts.find((t) => t.id === obj.id)?.locked,
              );
              if (!isLocked) store.removeText(currentSlideId, obj.id);
              break;
          }
          if (isLocked) {
            hasLockedObject = true;
          }
        }
        if (hasLockedObject) {
          toast.info('ロック中のオブジェクトは保護されています');
        } else {
          store.clearSelection();
        }
      } else {
        // ピッチ上オブジェクト非選択時はアクティブスライドを削除
        const project = store.project;
        if (project.slides.length <= 1) {
          toast.error('これ以上スライドを削除できません（最低1枚必要です）');
          return;
        }
        store.deleteSlide(currentSlideId);
        toast.success('スライドを削除しました（Ctrl+Zで復元可能）');
      }
    },
    { enableOnFormTags: false },
  );
}
