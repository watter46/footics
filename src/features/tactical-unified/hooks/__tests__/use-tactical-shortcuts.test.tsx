import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTacticalShortcuts } from '../use-tactical-shortcuts';

describe('useTacticalShortcuts', () => {
  it('triggers undo and redo callbacks on mod+z and mod+shift+z', () => {
    const undo = vi.fn();
    const redo = vi.fn();

    renderHook(() =>
      useTacticalShortcuts({
        undo,
        redo,
      }),
    );

    fireEvent.keyDown(document, { key: 'z', code: 'KeyZ', ctrlKey: true });
    expect(undo).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, {
      key: 'z',
      code: 'KeyZ',
      ctrlKey: true,
      shiftKey: true,
    });
    expect(redo).toHaveBeenCalledTimes(1);
  });

  it('triggers deleteSelected on backspace or delete key', () => {
    const deleteSelected = vi.fn();

    renderHook(() =>
      useTacticalShortcuts({
        deleteSelected,
      }),
    );

    fireEvent.keyDown(document, { key: 'Backspace', code: 'Backspace' });
    expect(deleteSelected).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Delete', code: 'Delete' });
    expect(deleteSelected).toHaveBeenCalledTimes(2);
  });

  it('triggers clearSelection on Escape key', () => {
    const clearSelection = vi.fn();

    renderHook(() =>
      useTacticalShortcuts({
        clearSelection,
      }),
    );

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(clearSelection).toHaveBeenCalledTimes(1);
  });

  it('does not trigger callbacks when enabled is false', () => {
    const undo = vi.fn();

    renderHook(() =>
      useTacticalShortcuts({
        undo,
        enabled: false,
      }),
    );

    fireEvent.keyDown(document, { key: 'z', code: 'KeyZ', ctrlKey: true });
    expect(undo).not.toHaveBeenCalled();
  });

  it('does not trigger callbacks when an input element is focused', () => {
    const deleteSelected = vi.fn();

    renderHook(() =>
      useTacticalShortcuts({
        deleteSelected,
      }),
    );

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: 'Delete', code: 'Delete' });
    expect(deleteSelected).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });
});
