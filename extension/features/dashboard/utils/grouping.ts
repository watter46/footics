import type { CapturedScreenshot } from '~/features/capture/db/screenshot-db';

export interface VideoGroup {
  videoUrl: string;
  videoTitle: string;
  screenshots: CapturedScreenshot[];
  latestTimestamp: number;
  count: number;
  favoriteCount: number;
}

/**
 * スクリーンショット一覧を動画（URL または タイトル）ごとにグルーピングし、
 * 各動画内のスクショを timestamp 降順、動画グループ自体も最新撮影順にソートする。
 */
export function groupScreenshotsByVideo(
  screenshots: CapturedScreenshot[],
): VideoGroup[] {
  if (screenshots.length === 0) {
    return [];
  }

  const map = new Map<string, CapturedScreenshot[]>();

  for (const s of screenshots) {
    // videoUrl が存在すればそれをキーとし、無ければ videoTitle または '__default__' をキーにする
    const key = s.videoUrl?.trim() || s.videoTitle?.trim() || '__unknown__';
    const list = map.get(key);
    if (list) {
      list.push(s);
    } else {
      map.set(key, [s]);
    }
  }

  const groups: VideoGroup[] = [];

  for (const [, list] of map.entries()) {
    // グループ内のスクショを timestamp 降順にソート
    list.sort((a, b) => b.timestamp - a.timestamp);

    const latest = list[0];
    const favoriteCount = list.filter((s) => s.isFavorite).length;

    groups.push({
      videoUrl: latest.videoUrl || '',
      videoTitle: latest.videoTitle || 'Untitled Video',
      screenshots: list,
      latestTimestamp: latest.timestamp,
      count: list.length,
      favoriteCount,
    });
  }

  // 最新のキャプチャ日時（latestTimestamp）降順でグループをソート
  groups.sort((a, b) => b.latestTimestamp - a.latestTimestamp);

  return groups;
}
