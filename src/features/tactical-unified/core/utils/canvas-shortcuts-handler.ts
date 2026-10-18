import type { DrawingTool } from '../types';

export const TOOL_KEYS: Record<string, DrawingTool> = {
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

export interface ShortcutActions {
  setActiveTool: (tool: DrawingTool) => void;
  removeSelected: () => void;
  clearSelection: () => void;
  selectAll: () => void;
  undo: () => void;
  redo: () => void;
  copy: () => void;
  paste: () => void;
  duplicate: () => void;
  cancelConnecting?: () => void;
}

export function isEditableTarget(target: HTMLElement | null): boolean {
  return (
    target?.tagName === 'INPUT' ||
    target?.tagName === 'TEXTAREA' ||
    Boolean(target?.isContentEditable)
  );
}

function handleModifierShortcuts(
  e: KeyboardEvent,
  actions: ShortcutActions,
): boolean {
  if (!e.ctrlKey && !e.metaKey) return false;
  const key = e.key.toLowerCase();

  if ((e.shiftKey && key === 'z') || key === 'y') {
    e.preventDefault();
    actions.redo();
    return true;
  }
  if (key === 'z') {
    e.preventDefault();
    actions.undo();
    return true;
  }
  if (key === 'a') {
    e.preventDefault();
    actions.selectAll();
    return true;
  }
  if (key === 'c') {
    e.preventDefault();
    actions.copy();
    return true;
  }
  if (key === 'v') {
    e.preventDefault();
    actions.paste();
    return true;
  }
  if (key === 'd') {
    e.preventDefault();
    actions.duplicate();
    return true;
  }
  return true;
}

function handleStandardShortcuts(
  e: KeyboardEvent,
  actions: ShortcutActions,
): void {
  if (e.code === 'Space') {
    e.preventDefault();
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    actions.cancelConnecting?.();
    actions.clearSelection();
    actions.setActiveTool('select');
    return;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    actions.removeSelected();
    return;
  }
  const tool = TOOL_KEYS[e.key.toLowerCase()];
  if (tool) {
    e.preventDefault();
    actions.setActiveTool(tool);
  }
}

export function dispatchCanvasShortcut(
  e: KeyboardEvent,
  actions: ShortcutActions,
): void {
  if (isEditableTarget(e.target as HTMLElement | null)) return;
  if (handleModifierShortcuts(e, actions)) return;
  handleStandardShortcuts(e, actions);
}
