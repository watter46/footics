import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import type { CapturedScreenshot } from '../../../capture/db/screenshot-db';
import { VideoMetaInfo } from '../VideoMetaInfo';

describe('VideoMetaInfo', () => {
  it('renders video title, url link, and formatted time', () => {
    const mockScreenshot: CapturedScreenshot = {
      id: 'shot-1',
      timestamp: Date.now(),
      videoTitle: 'Arsenal vs Chelsea Tactical Analysis',
      videoUrl: 'https://youtube.com/watch?v=abcdef',
      videoTime: 125, // 2:05
      imageDataUrl: 'data:image/png;base64,data',
    };

    render(<VideoMetaInfo screenshot={mockScreenshot} />);

    expect(
      screen.getByText('Arsenal vs Chelsea Tactical Analysis'),
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: '元動画を開く' });
    expect(link).toHaveAttribute('href', 'https://youtube.com/watch?v=abcdef');
    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('renders fallback title when screenshot has no title', () => {
    render(<VideoMetaInfo screenshot={null} />);

    expect(screen.getByText('Footics Quick Canvas')).toBeInTheDocument();
  });
});
