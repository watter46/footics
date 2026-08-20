import type { Match } from '@/types';

/**
 * 試合日付（ISO文字列またはDateオブジェクト）からシーズン文字列（'YY-YY' 形式、例: '26-27', '25-26'）を導出する。
 *
 * ヨーロッパ主要リーグのシーズンサイクルに基づき、
 * 7月〜12月: 当年-翌年 (例: 2026-08-20 -> '26-27')
 * 1月〜6月: 前年-当年 (例: 2027-03-15 -> '26-27')
 */
export function getSeasonFromDate(
  dateInput?: string | Date | null,
  fallbackYear?: number,
): string {
  if (!dateInput) {
    const defaultYear = fallbackYear ?? new Date().getFullYear();
    const startYY = String(defaultYear % 100).padStart(2, '0');
    const endYY = String((defaultYear + 1) % 100).padStart(2, '0');
    return `${startYY}-${endYY}`;
  }

  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) {
    const defaultYear = fallbackYear ?? new Date().getFullYear();
    const startYY = String(defaultYear % 100).padStart(2, '0');
    const endYY = String((defaultYear + 1) % 100).padStart(2, '0');
    return `${startYY}-${endYY}`;
  }

  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  const startYear = month >= 7 ? year : year - 1;
  const startYY = String(startYear % 100).padStart(2, '0');
  const endYY = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYY}-${endYY}`;
}

/**
 * 試合データ一覧およびデフォルトシーズンリストから、利用可能なシーズン一覧（降順）を抽出する。
 */
export function extractAvailableSeasons(
  matches: Match[] = [],
  defaultSeasons: readonly string[] = ['26-27', '25-26', '24-25'],
): string[] {
  const seasons = new Set<string>(defaultSeasons);

  for (const m of matches) {
    if (m?.date) {
      const season = getSeasonFromDate(m.date);
      if (season) {
        seasons.add(season);
      }
    }
  }

  // 降順（最新シーズンが先頭）にソート
  return Array.from(seasons).sort((a, b) => b.localeCompare(a));
}
