import { renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core';
import { useQuickCanvasShortcuts } from '../use-quick-canvas-shortcuts';

describe('useQuickCanvasShortcuts', () => {
  const mockCanvasHandle: CanvasCoreHandle = {
    exportPng: vi.fn(),
    copyToClipboard: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: vi.fn().mockReturnValue(true),
    canRedo: vi.fn().mockReturnValue(false),
  };

  const canvasRef = {
    current: mockCanvasHandle,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers undo on Ctrl+Z', () => {
    renderHook(() => useQuickCanvasShortcuts(canvasRef));

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }),
    );

    expect(mockCanvasHandle.undo).toHaveBeenCalledTimes(1);
    expect(mockCanvasHandle.redo).not.toHaveBeenCalled();
  });

  it('triggers redo on Ctrl+Shift+Z or Ctrl+Y', () => {
    renderHook(() => useQuickCanvasShortcuts(canvasRef));

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
      }),
    );
    expect(mockCanvasHandle.redo).toHaveBeenCalledTimes(1);

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }),
    );
    expect(mockCanvasHandle.redo).toHaveBeenCalledTimes(2);
  });
});
