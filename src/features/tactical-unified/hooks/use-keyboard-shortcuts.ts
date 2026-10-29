/**
 * use-keyboard-shortcuts.ts
 * Keyboard shortcuts: Delete, Escape, Backspace, Copy (Mod+C), Paste (Mod+V), Duplicate (Mod+D), Tool switching, Space (Playback), Undo/Redo
 */

import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import {
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreApi } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
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
  const storeApi = useTacticalUnifiedStoreApi();

  // Undo: Mod+Z (Ctrl+Z / Cmd+Z)
  useHotkeys(
    ['mod+z', 'meta+z'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      storeApi.getState().undo();
    },
    { enableOnFormTags: false },
  );

  // Redo: Mod+Shift+Z / Mod+Y (Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y / Cmd+Y)
  useHotkeys(
    ['mod+shift+z', 'meta+shift+z', 'mod+y', 'meta+y'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      storeApi.getState().redo();
    },
    { enableOnFormTags: false },
  );

  // Copy: Mod+C (Ctrl+C / Cmd+C)
  useHotkeys(
    ['mod+c', 'meta+c'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const currentSlideId = storeApi.getState().activeSlideId;
      storeApi.getState().copySelectedObjects(currentSlideId);
    },
    { enableOnFormTags: false },
  );

  // Paste: Mod+V (Ctrl+V / Cmd+V)
  useHotkeys(
    ['mod+v', 'meta+v'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const currentSlideId = storeApi.getState().activeSlideId;
      storeApi.getState().pasteObjects(currentSlideId);
    },
    { enableOnFormTags: false },
  );

  // Duplicate: Mod+D (Ctrl+D / Cmd+D)
  useHotkeys(
    ['mod+d', 'meta+d'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const currentSlideId = storeApi.getState().activeSlideId;
      storeApi.getState().duplicateSelectedObjects(currentSlideId);
    },
    { enableOnFormTags: false },
  );

  // Playback: Space
  useHotkeys(
    'space',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      storeApi.getState().togglePlayback();
    },
    { enableOnFormTags: false },
  );

  // Escape: Clear selection
  useHotkeys(
    'escape',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      storeApi.getState().clearSelection();
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
        storeApi.getState().setActiveTool(tool);
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
      const store = storeApi.getState();
      const currentSlideId = store.activeSlideId;
      const currentSelected = store.selectedObjects;

      if (currentSelected.length > 0) {
        const slide = selectActiveSlide(store);
        const hasLockedObject = currentSelected.some((obj) => {
          if (obj.kind === 'player') {
            return Boolean(slide?.players.find((p) => p.id === obj.id)?.locked);
          }
          if (obj.kind === 'arrow') {
            return Boolean(slide?.arrows.find((a) => a.id === obj.id)?.locked);
          }
          if (obj.kind === 'zone') {
            return Boolean(slide?.zones.find((z) => z.id === obj.id)?.locked);
          }
          if (obj.kind === 'text') {
            return Boolean(slide?.texts.find((t) => t.id === obj.id)?.locked);
          }
          return false;
        });

        store.deleteSelectedObjects(currentSlideId);

        if (hasLockedObject) {
          toast.info('ロック中のオブジェクトは保護されています');
        }
      } else {
        // ピッチ上オブジェクト非選択時はアクティブスライドを削除
        const activeSlides = selectActivePhaseSlides(store);
        if (activeSlides.length <= 1) {
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
