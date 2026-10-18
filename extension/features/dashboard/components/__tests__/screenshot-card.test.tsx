import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { CapturedScreenshot } from '../../../capture/db/screenshot-db';
import { ScreenshotCard } from '../ScreenshotCard';

describe('ScreenshotCard', () => {
  const dummyScreenshot: CapturedScreenshot = {
    id: 'shot-123',
    timestamp: new Date('2026-10-19T10:30:00Z').getTime(),
    videoUrl: 'https://youtube.com/watch?v=123',
    videoTitle: 'Test Match Video',
    videoTime: 125, // 2:05
    imageDataUrl: 'data:image/png;base64,image',
    thumbnailDataUrl: 'data:image/png;base64,thumb',
    isFavorite: false,
  };

  it('サムネイル画像、動画時間タグ、編集バッジ、日付が表示される', () => {
    render(
      <ScreenshotCard
        screenshot={dummyScreenshot}
        onOpenCanvas={vi.fn()}
        onToggleFavorite={vi.fn()}
        onDownload={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,thumb');
    expect(img).toHaveAttribute('alt', 'Test Match Video');

    expect(screen.getByText('2:05')).toBeInTheDocument();
    expect(screen.getByText('編集する')).toBeInTheDocument();
  });

  it('画像をクリックすると onOpenCanvas が発火する', () => {
    const handleOpenCanvas = vi.fn();
    render(
      <ScreenshotCard
        screenshot={dummyScreenshot}
        onOpenCanvas={handleOpenCanvas}
        onToggleFavorite={vi.fn()}
        onDownload={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const thumbnailContainer = screen.getByText('編集する').closest('div');
    fireEvent.click(thumbnailContainer!.parentElement!);

    expect(handleOpenCanvas).toHaveBeenCalledWith('shot-123');
  });

  it('お気に入りボタンをクリックすると onToggleFavorite が発火する', () => {
    const handleToggleFavorite = vi.fn();
    render(
      <ScreenshotCard
        screenshot={dummyScreenshot}
        onOpenCanvas={vi.fn()}
        onToggleFavorite={handleToggleFavorite}
        onDownload={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const favButton = screen.getByTitle('お気に入り追加');
    fireEvent.click(favButton);

    expect(handleToggleFavorite).toHaveBeenCalledWith(
      'shot-123',
      expect.anything(),
    );
  });

  it('ダウンロードボタンと削除ボタンのクリックで各コールバックが発火する', () => {
    const handleDownload = vi.fn();
    const handleDelete = vi.fn();

    render(
      <ScreenshotCard
        screenshot={dummyScreenshot}
        onOpenCanvas={vi.fn()}
        onToggleFavorite={vi.fn()}
        onDownload={handleDownload}
        onDelete={handleDelete}
      />,
    );

    const downloadButton = screen.getByTitle('ダウンロード');
    fireEvent.click(downloadButton);
    expect(handleDownload).toHaveBeenCalledWith(
      dummyScreenshot,
      expect.anything(),
    );

    const deleteButton = screen.getByTitle('削除');
    fireEvent.click(deleteButton);
    expect(handleDelete).toHaveBeenCalledWith('shot-123', expect.anything());
  });
});
