import { describe, expect, it } from 'vitest';
import type { CapturedScreenshot } from '../../capture/db/screenshot-db';
import { groupScreenshotsByVideo } from '../utils/grouping';

describe('groupScreenshotsByVideo', () => {
  const dummyItem = (
    overrides: Partial<CapturedScreenshot>,
  ): CapturedScreenshot => ({
    id: `item-${Math.random()}`,
    timestamp: Date.now(),
    videoUrl: 'https://youtube.com/v1',
    videoTitle: 'Match 1',
    imageDataUrl: 'data:image/jpeg;base64,data',
    isFavorite: false,
    ...overrides,
  });

  it('returns empty array when screenshots array is empty', () => {
    const groups = groupScreenshotsByVideo([]);
    expect(groups).toEqual([]);
  });

  it('groups screenshots by videoUrl and computes correct stats', () => {
    const items: CapturedScreenshot[] = [
      dummyItem({
        id: '1',
        videoUrl: 'https://youtube.com/v1',
        videoTitle: 'Arsenal vs Chelsea',
        timestamp: 1000,
        isFavorite: false,
      }),
      dummyItem({
        id: '2',
        videoUrl: 'https://youtube.com/v1',
        videoTitle: 'Arsenal vs Chelsea Updated',
        timestamp: 3000,
        isFavorite: true,
      }),
      dummyItem({
        id: '3',
        videoUrl: 'https://youtube.com/v2',
        videoTitle: 'Real Madrid vs Barcelona',
        timestamp: 2000,
        isFavorite: true,
      }),
    ];

    const groups = groupScreenshotsByVideo(items);

    expect(groups).toHaveLength(2);

    // Sorted by latest timestamp descending (v1 latest is 3000, v2 latest is 2000)
    expect(groups[0].videoUrl).toBe('https://youtube.com/v1');
    expect(groups[0].videoTitle).toBe('Arsenal vs Chelsea Updated'); // latest title
    expect(groups[0].count).toBe(2);
    expect(groups[0].favoriteCount).toBe(1);
    expect(groups[0].latestTimestamp).toBe(3000);
    expect(groups[0].screenshots.map((s) => s.id)).toEqual(['2', '1']); // sorted by timestamp desc

    expect(groups[1].videoUrl).toBe('https://youtube.com/v2');
    expect(groups[1].videoTitle).toBe('Real Madrid vs Barcelona');
    expect(groups[1].count).toBe(1);
    expect(groups[1].favoriteCount).toBe(1);
    expect(groups[1].latestTimestamp).toBe(2000);
  });

  it('handles screenshots with empty videoUrl gracefully by grouping under fallback', () => {
    const items: CapturedScreenshot[] = [
      dummyItem({
        id: 'standalone-1',
        videoUrl: '',
        videoTitle: 'Direct Tab Capture',
        timestamp: 5000,
      }),
    ];

    const groups = groupScreenshotsByVideo(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].videoTitle).toBe('Direct Tab Capture');
    expect(groups[0].count).toBe(1);
  });
});
