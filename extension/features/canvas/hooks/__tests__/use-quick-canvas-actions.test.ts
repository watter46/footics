import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core';
import * as screenshotDb from '../../../capture/db/screenshot-db';
import { useQuickCanvasActions } from '../use-quick-canvas-actions';

vi.mock('../../../capture/db/screenshot-db', () => ({
  toggleFavorite: vi.fn(),
  updateScreenshot: vi.fn(),
}));

describe('useQuickCanvasActions', () => {
  const mockScreenshot: screenshotDb.CapturedScreenshot = {
    id: 'shot-1',
    timestamp: Date.now(),
    videoTitle: 'Test Video',
    videoUrl: 'https://youtube.com/watch?v=test',
    videoTime: 10,
    imageDataUrl: 'data:image/png;base64,data',
    isFavorite: false,
  };

  const mockCanvasHandle: CanvasCoreHandle = {
    exportPng: vi.fn().mockResolvedValue('data:image/png;base64,exported'),
    copyToClipboard: vi.fn().mockResolvedValue(undefined),
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

  it('toggles favorite and updates state', async () => {
    vi.mocked(screenshotDb.toggleFavorite).mockResolvedValue(true);

    const { result } = renderHook(() =>
      useQuickCanvasActions({
        screenshot: mockScreenshot,
        canvasRef,
      }),
    );

    expect(result.current.isFavorite).toBe(false);

    await act(async () => {
      await result.current.handleToggleFavorite();
    });

    expect(screenshotDb.toggleFavorite).toHaveBeenCalledWith('shot-1');
    expect(result.current.isFavorite).toBe(true);
    expect(result.current.toastMessage).toContain('お気に入りに追加しました');
  });

  it('calls copyToClipboard on canvasRef', async () => {
    const { result } = renderHook(() =>
      useQuickCanvasActions({
        screenshot: mockScreenshot,
        canvasRef,
      }),
    );

    await act(async () => {
      await result.current.handleCopyClipboard();
    });

    expect(mockCanvasHandle.copyToClipboard).toHaveBeenCalledWith({
      crop: true,
    });
    expect(result.current.toastMessage).toContain('クリップボードにコピー');
  });

  it('calls exportPng and triggers download', async () => {
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        if (tag === 'a') {
          const a = origCreateElement('a');
          a.click = clickSpy;
          return a;
        }
        return origCreateElement(tag);
      });

    const { result } = renderHook(() =>
      useQuickCanvasActions({
        screenshot: mockScreenshot,
        canvasRef,
      }),
    );

    await act(async () => {
      await result.current.handleDownload();
    });

    expect(mockCanvasHandle.exportPng).toHaveBeenCalledWith({
      crop: true,
      scale: 2,
    });
    expect(clickSpy).toHaveBeenCalled();
    expect(result.current.toastMessage).toContain('画像を保存しました');

    createElementSpy.mockRestore();
  });

  it('calls updateScreenshot on autoSave', async () => {
    const { result } = renderHook(() =>
      useQuickCanvasActions({
        screenshot: mockScreenshot,
        canvasRef,
      }),
    );

    await act(async () => {
      await result.current.handleAutoSave('{"annotations":[]}');
    });

    expect(screenshotDb.updateScreenshot).toHaveBeenCalledWith('shot-1', {
      canvasAnnotations: '{"annotations":[]}',
    });
  });
});
