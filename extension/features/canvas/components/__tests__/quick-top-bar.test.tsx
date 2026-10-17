import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core/types';
import type { CapturedScreenshot } from '../../../capture/db/screenshot-db';
import { QuickCanvasTopBar } from '../QuickCanvasTopBar';

const mockScreenshot: CapturedScreenshot = {
  id: 'shot-1',
  timestamp: Date.now(),
  videoTitle: 'Arsenal vs Man City Tactics',
  videoUrl: 'https://youtube.com/watch?v=mock',
  videoTime: 125,
  imageDataUrl: 'data:image/png;base64,mock',
  isFavorite: false,
};

describe('QuickCanvasTopBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Callback handlers', () => {
    it('triggers action callbacks when buttons are clicked', () => {
      const onUndo = vi.fn();
      const onRedo = vi.fn();
      const onToggleFavorite = vi.fn();
      const onCopyClipboard = vi.fn();
      const onDownload = vi.fn();
      const onShareX = vi.fn();
      const onOpenDashboard = vi.fn();
      const onSelectRatio = vi.fn();

      render(
        <QuickCanvasTopBar
          screenshot={mockScreenshot}
          canUndo={true}
          canRedo={true}
          onUndo={onUndo}
          onRedo={onRedo}
          isFavorite={false}
          onToggleFavorite={onToggleFavorite}
          onCopyClipboard={onCopyClipboard}
          onDownload={onDownload}
          onShareX={onShareX}
          onOpenDashboard={onOpenDashboard}
          onSelectRatio={onSelectRatio}
        />,
      );

      // コピーボタン
      const copyBtn = screen.getByRole('button', { name: '画像コピー' });
      fireEvent.click(copyBtn);
      expect(onCopyClipboard).toHaveBeenCalledTimes(1);

      // 保存ボタン
      const downloadBtn = screen.getByRole('button', { name: '画像保存' });
      fireEvent.click(downloadBtn);
      expect(onDownload).toHaveBeenCalledTimes(1);

      // X共有ボタン
      const shareBtn = screen.getByRole('button', { name: 'X共有' });
      fireEvent.click(shareBtn);
      expect(onShareX).toHaveBeenCalledTimes(1);

      // お気に入りボタン
      const favBtn = screen.getByRole('button', { name: 'お気に入りトグル' });
      fireEvent.click(favBtn);
      expect(onToggleFavorite).toHaveBeenCalledTimes(1);

      // 一覧 (ダッシュボード) ボタン
      const dashBtn = screen.getByRole('button', {
        name: 'ダッシュボード一覧',
      });
      fireEvent.click(dashBtn);
      expect(onOpenDashboard).toHaveBeenCalledTimes(1);

      // Undo / Redo ボタン
      const undoBtn = screen.getByRole('button', { name: '元に戻す' });
      fireEvent.click(undoBtn);
      expect(onUndo).toHaveBeenCalledTimes(1);

      const redoBtn = screen.getByRole('button', { name: 'やり直す' });
      fireEvent.click(redoBtn);
      expect(onRedo).toHaveBeenCalledTimes(1);

      // 比率選択ボタン
      const ratio169Btn = screen.getByRole('button', {
        name: '境界線比率 16:9',
      });
      fireEvent.click(ratio169Btn);
      expect(onSelectRatio).toHaveBeenCalledWith('16:9');

      const ratioFullBtn = screen.getByRole('button', {
        name: '全画面クロップなし',
      });
      fireEvent.click(ratioFullBtn);
      expect(onSelectRatio).toHaveBeenCalledWith('full');
    });
  });

  describe('CanvasCoreHandle Ref handlers', () => {
    it('calls canvasRef methods when callbacks are not provided', () => {
      const mockCanvasHandle: CanvasCoreHandle & {
        applyRatio?: (ratio: string) => void;
      } = {
        exportPng: vi.fn().mockResolvedValue('data:image/png;base64,export'),
        copyToClipboard: vi.fn().mockResolvedValue(undefined),
        undo: vi.fn(),
        redo: vi.fn(),
        canUndo: vi.fn().mockReturnValue(true),
        canRedo: vi.fn().mockReturnValue(true),
        applyRatio: vi.fn(),
      };

      const canvasRef = {
        current: mockCanvasHandle,
      };

      render(
        <QuickCanvasTopBar
          screenshot={mockScreenshot}
          canvasRef={canvasRef}
          canUndo={true}
          canRedo={true}
        />,
      );

      // コピーボタン
      const copyBtn = screen.getByRole('button', { name: '画像コピー' });
      fireEvent.click(copyBtn);
      expect(mockCanvasHandle.copyToClipboard).toHaveBeenCalledWith({
        crop: true,
      });

      // 保存ボタン
      const downloadBtn = screen.getByRole('button', { name: '画像保存' });
      fireEvent.click(downloadBtn);
      expect(mockCanvasHandle.exportPng).toHaveBeenCalledWith({
        crop: true,
        scale: 2,
      });

      // Undo / Redo ボタン
      const undoBtn = screen.getByRole('button', { name: '元に戻す' });
      fireEvent.click(undoBtn);
      expect(mockCanvasHandle.undo).toHaveBeenCalledTimes(1);

      const redoBtn = screen.getByRole('button', { name: 'やり直す' });
      fireEvent.click(redoBtn);
      expect(mockCanvasHandle.redo).toHaveBeenCalledTimes(1);

      // 比率選択ボタン
      const ratio916Btn = screen.getByRole('button', {
        name: '境界線比率 9:16',
      });
      fireEvent.click(ratio916Btn);
      expect(mockCanvasHandle.applyRatio).toHaveBeenCalledWith('9:16');
    });
  });
});
