import { beforeEach, describe, expect, it } from 'vitest';
import {
  type CapturedScreenshot,
  deleteScreenshot,
  deleteScreenshotsByVideo,
  getAllScreenshots,
  getScreenshotById,
  getScreenshotsByVideo,
  purgeOldScreenshots,
  saveCapturedScreenshot,
  screenshotDb,
  toggleFavorite,
  updateScreenshot,
} from '../screenshot-db';

describe('ScreenshotDatabase (Dexie)', () => {
  beforeEach(async () => {
    await screenshotDb.capturedScreenshots.clear();
  });

  const createDummyScreenshot = (
    overrides: Partial<CapturedScreenshot> = {},
  ): CapturedScreenshot => ({
    id: `shot-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    videoUrl: 'https://www.youtube.com/watch?v=sample123',
    videoTitle: 'Sample Match 2026',
    videoTime: 120,
    imageDataUrl: 'data:image/jpeg;base64,sample-image-data',
    thumbnailDataUrl: 'data:image/jpeg;base64,sample-thumb-data',
    canvasAnnotations: JSON.stringify({ version: '1.0', shapes: [] }),
    isFavorite: false,
    syncedToFootics: false,
    ...overrides,
  });

  describe('CRUD Operations', () => {
    it('saves and retrieves a screenshot by id', async () => {
      const item = createDummyScreenshot({ id: 'test-1' });
      await saveCapturedScreenshot(item);

      const retrieved = await getScreenshotById('test-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-1');
      expect(retrieved?.videoTitle).toBe('Sample Match 2026');
      expect(retrieved?.videoTime).toBe(120);
    });

    it('retrieves all screenshots sorted by timestamp descending', async () => {
      const now = Date.now();
      const item1 = createDummyScreenshot({ id: 's1', timestamp: now - 2000 });
      const item2 = createDummyScreenshot({ id: 's2', timestamp: now - 1000 });
      const item3 = createDummyScreenshot({ id: 's3', timestamp: now });

      await saveCapturedScreenshot(item1);
      await saveCapturedScreenshot(item3);
      await saveCapturedScreenshot(item2);

      const all = await getAllScreenshots();
      expect(all).toHaveLength(3);
      expect(all.map((s) => s.id)).toEqual(['s3', 's2', 's1']);
    });

    it('retrieves screenshots filtered by videoUrl', async () => {
      const item1 = createDummyScreenshot({
        id: 'v1-1',
        videoUrl: 'https://example.com/v1',
      });
      const item2 = createDummyScreenshot({
        id: 'v1-2',
        videoUrl: 'https://example.com/v1',
      });
      const item3 = createDummyScreenshot({
        id: 'v2-1',
        videoUrl: 'https://example.com/v2',
      });

      await saveCapturedScreenshot(item1);
      await saveCapturedScreenshot(item2);
      await saveCapturedScreenshot(item3);

      const v1List = await getScreenshotsByVideo('https://example.com/v1');
      expect(v1List).toHaveLength(2);
      expect(v1List.map((s) => s.id)).toContain('v1-1');
      expect(v1List.map((s) => s.id)).toContain('v1-2');
    });

    it('updates screenshot annotations and properties', async () => {
      const item = createDummyScreenshot({ id: 'update-target' });
      await saveCapturedScreenshot(item);

      const updatedAnnotations = JSON.stringify({ shapes: [{ type: 'pen' }] });
      const updatedCount = await updateScreenshot('update-target', {
        canvasAnnotations: updatedAnnotations,
        isFavorite: true,
      });

      expect(updatedCount).toBe(1);

      const updated = await getScreenshotById('update-target');
      expect(updated?.canvasAnnotations).toBe(updatedAnnotations);
      expect(updated?.isFavorite).toBe(true);
    });

    it('deletes a single screenshot by id', async () => {
      const item = createDummyScreenshot({ id: 'delete-target' });
      await saveCapturedScreenshot(item);

      await deleteScreenshot('delete-target');
      const retrieved = await getScreenshotById('delete-target');
      expect(retrieved).toBeUndefined();
    });

    it('deletes all screenshots associated with a videoUrl', async () => {
      const item1 = createDummyScreenshot({
        id: 'del-v1',
        videoUrl: 'https://example.com/target',
      });
      const item2 = createDummyScreenshot({
        id: 'del-v2',
        videoUrl: 'https://example.com/target',
      });
      const item3 = createDummyScreenshot({
        id: 'keep-v',
        videoUrl: 'https://example.com/other',
      });

      await saveCapturedScreenshot(item1);
      await saveCapturedScreenshot(item2);
      await saveCapturedScreenshot(item3);

      const deletedCount = await deleteScreenshotsByVideo(
        'https://example.com/target',
      );
      expect(deletedCount).toBe(2);

      const remaining = await getAllScreenshots();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('keep-v');
    });

    it('toggles favorite status properly', async () => {
      const item = createDummyScreenshot({
        id: 'fav-target',
        isFavorite: false,
      });
      await saveCapturedScreenshot(item);

      const isFav1 = await toggleFavorite('fav-target');
      expect(isFav1).toBe(true);
      expect((await getScreenshotById('fav-target'))?.isFavorite).toBe(true);

      const isFav2 = await toggleFavorite('fav-target');
      expect(isFav2).toBe(false);
      expect((await getScreenshotById('fav-target'))?.isFavorite).toBe(false);
    });
  });

  describe('Cleanup Policy (purgeOldScreenshots)', () => {
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const NINETY_ONE_DAYS = 91 * ONE_DAY;

    it('does NOT purge anything if total count is under maxThreshold (100), even if older than 90 days', async () => {
      const now = Date.now();
      // 50件保存（すべて91日以上前）
      const screenshots: CapturedScreenshot[] = [];
      for (let i = 0; i < 50; i++) {
        screenshots.push(
          createDummyScreenshot({
            id: `old-${i}`,
            timestamp: now - NINETY_ONE_DAYS - i * 1000,
            isFavorite: false,
          }),
        );
      }
      await screenshotDb.capturedScreenshots.bulkAdd(screenshots);

      const purged = await purgeOldScreenshots({
        retentionDays: 90,
        maxThreshold: 100,
        now,
      });

      expect(purged).toBe(0);
      const remaining = await screenshotDb.capturedScreenshots.count();
      expect(remaining).toBe(50);
    });

    it('purges items older than 90 days when total count is >= 100, starting from oldest', async () => {
      const now = Date.now();
      const screenshots: CapturedScreenshot[] = [];

      // 10件: 91日以上前の古いアイテム
      for (let i = 0; i < 10; i++) {
        screenshots.push(
          createDummyScreenshot({
            id: `old-${i}`,
            timestamp: now - NINETY_ONE_DAYS - (10 - i) * 1000,
            isFavorite: false,
          }),
        );
      }

      // 95件: 最近のアイテム（1日以内）
      for (let i = 0; i < 95; i++) {
        screenshots.push(
          createDummyScreenshot({
            id: `recent-${i}`,
            timestamp: now - i * 1000,
            isFavorite: false,
          }),
        );
      }

      // 合計 105 件（>= 100 件の閾値超過）
      await screenshotDb.capturedScreenshots.bulkAdd(screenshots);

      const purged = await purgeOldScreenshots({
        retentionDays: 90,
        maxThreshold: 100,
        now,
      });

      // 91日以上前の 10 件が削除されるべき
      expect(purged).toBe(10);
      const remaining = await screenshotDb.capturedScreenshots.count();
      expect(remaining).toBe(95);

      const oldExists = await getScreenshotById('old-0');
      expect(oldExists).toBeUndefined();
    });

    it('protects favorite items from being purged even if older than 90 days and total count >= 100', async () => {
      const now = Date.now();
      const screenshots: CapturedScreenshot[] = [];

      // 5件: 91日以上前、かつ isFavorite = true
      for (let i = 0; i < 5; i++) {
        screenshots.push(
          createDummyScreenshot({
            id: `fav-old-${i}`,
            timestamp: now - NINETY_ONE_DAYS - i * 1000,
            isFavorite: true,
          }),
        );
      }

      // 5件: 91日以上前、かつ isFavorite = false
      for (let i = 0; i < 5; i++) {
        screenshots.push(
          createDummyScreenshot({
            id: `unfav-old-${i}`,
            timestamp: now - NINETY_ONE_DAYS - i * 1000,
            isFavorite: false,
          }),
        );
      }

      // 95件: 最近のアイテム
      for (let i = 0; i < 95; i++) {
        screenshots.push(
          createDummyScreenshot({
            id: `recent-${i}`,
            timestamp: now - i * 1000,
            isFavorite: false,
          }),
        );
      }

      // 合計 105 件
      await screenshotDb.capturedScreenshots.bulkAdd(screenshots);

      const purged = await purgeOldScreenshots({
        retentionDays: 90,
        maxThreshold: 100,
        now,
      });

      // 非お気に入りの古い 5 件のみ削除される
      expect(purged).toBe(5);

      const remaining = await screenshotDb.capturedScreenshots.count();
      expect(remaining).toBe(100);

      // お気に入り古いアイテムは残っていること
      const favOld = await getScreenshotById('fav-old-0');
      expect(favOld).toBeDefined();
      expect(favOld?.isFavorite).toBe(true);

      // 非お気に入り古いアイテムは削除されていること
      const unfavOld = await getScreenshotById('unfav-old-0');
      expect(unfavOld).toBeUndefined();
    });
  });
});
