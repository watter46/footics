import Dexie, { type Table } from 'dexie';

export interface CapturedScreenshot {
  id: string;
  timestamp: number;
  videoUrl: string;
  videoTitle: string;
  videoTime?: number;
  imageDataUrl: string;
  thumbnailDataUrl?: string;
  canvasAnnotations?: string;
  isFavorite?: boolean;
  syncedToFootics?: boolean;
}

export class ScreenshotDatabase extends Dexie {
  capturedScreenshots!: Table<CapturedScreenshot, string>;

  constructor() {
    super('FooticsExtensionDB');
    this.version(1).stores({
      capturedScreenshots: '&id, timestamp, videoUrl, isFavorite',
    });
  }
}

export const screenshotDb = new ScreenshotDatabase();

/**
 * スクリーンショットを保存する
 */
export async function saveCapturedScreenshot(
  screenshot: CapturedScreenshot,
): Promise<string> {
  const item: CapturedScreenshot = {
    ...screenshot,
    isFavorite: screenshot.isFavorite ?? false,
    syncedToFootics: screenshot.syncedToFootics ?? false,
  };
  await screenshotDb.capturedScreenshots.put(item);
  return item.id;
}

/**
 * IDでスクリーンショットを取得する
 */
export async function getScreenshotById(
  id: string,
): Promise<CapturedScreenshot | undefined> {
  return await screenshotDb.capturedScreenshots.get(id);
}

/**
 * すべてのスクリーンショットを timestamp 降順（最新順）で取得する
 */
export async function getAllScreenshots(): Promise<CapturedScreenshot[]> {
  return await screenshotDb.capturedScreenshots
    .orderBy('timestamp')
    .reverse()
    .toArray();
}

/**
 * 指定した videoUrl のスクリーンショットを timestamp 降順で取得する
 */
export async function getScreenshotsByVideo(
  videoUrl: string,
): Promise<CapturedScreenshot[]> {
  const items = await screenshotDb.capturedScreenshots
    .where('videoUrl')
    .equals(videoUrl)
    .toArray();

  return items.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * スクリーンショットのプロパティを更新する
 */
export async function updateScreenshot(
  id: string,
  updates: Partial<CapturedScreenshot>,
): Promise<number> {
  return await screenshotDb.capturedScreenshots.update(id, updates);
}

/**
 * 単体のスクリーンショットを削除する
 */
export async function deleteScreenshot(id: string): Promise<void> {
  await screenshotDb.capturedScreenshots.delete(id);
}

/**
 * 指定した videoUrl のスクリーンショットを一括削除する
 */
export async function deleteScreenshotsByVideo(
  videoUrl: string,
): Promise<number> {
  const targets = await screenshotDb.capturedScreenshots
    .where('videoUrl')
    .equals(videoUrl)
    .toArray();

  const ids = targets.map((t) => t.id);
  await screenshotDb.capturedScreenshots.bulkDelete(ids);
  return ids.length;
}

/**
 * お気に入りステータスをトグルする
 */
export async function toggleFavorite(id: string): Promise<boolean> {
  const current = await getScreenshotById(id);
  if (!current) {
    throw new Error(`Screenshot with ID "${id}" not found`);
  }
  const nextFavorite = !current.isFavorite;
  await updateScreenshot(id, { isFavorite: nextFavorite });
  return nextFavorite;
}

export interface PurgeOptions {
  retentionDays?: number;
  maxThreshold?: number;
  now?: number;
}

/**
 * 古いスクリーンショットのクリーンアップ
 *
 * 条件:
 * 1. 総保存件数が maxThreshold（デフォルト100件）以上であること
 * 2. retentionDays（デフォルト90日）以上経過したアイテムであること
 * 3. お気に入り（isFavorite === true）は除外すること
 *
 * 削除は古い順（timestamp昇順）に行われる。
 */
export async function purgeOldScreenshots(
  options: PurgeOptions = {},
): Promise<number> {
  const retentionDays = options.retentionDays ?? 90;
  const maxThreshold = options.maxThreshold ?? 100;
  const now = options.now ?? Date.now();

  const totalCount = await screenshotDb.capturedScreenshots.count();
  if (totalCount < maxThreshold) {
    return 0;
  }

  const cutoffTime = now - retentionDays * 24 * 60 * 60 * 1000;

  // 90日以上経過したアイテムを timestamp 昇順で抽出
  const oldCandidates = await screenshotDb.capturedScreenshots
    .where('timestamp')
    .belowOrEqual(cutoffTime)
    .sortBy('timestamp');

  // お気に入り（isFavorite === true）を除外
  const targetsToDelete = oldCandidates.filter((item) => !item.isFavorite);

  if (targetsToDelete.length === 0) {
    return 0;
  }

  const deleteIds = targetsToDelete.map((item) => item.id);
  await screenshotDb.capturedScreenshots.bulkDelete(deleteIds);
  return deleteIds.length;
}
