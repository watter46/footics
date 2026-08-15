import type { EventRow } from '@/types';
import { PERIOD_LIMITS } from './features/memo-overlay/memoOverlayLogic';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Football match time formatter (e.g. 45:00, 45 + 2:00)
 */
export function formatTimelineTime(row: EventRow): string {
  const period = Number(row.period);
  const min = Number(row.minute);
  const sec = Number(row.second);
  const paddedSec = pad(sec);

  // Custom Event Mode
  if (row.source === 'custom') {
    const limit = PERIOD_LIMITS[period] ?? 45;
    if (min > limit && period <= 4) {
      return `${limit} + ${min - limit}:${paddedSec}`;
    }
    return `${pad(min)}:${paddedSec}`;
  }

  // WhoScored Event Mode (Existing logic using expanded_minute)
  const expMin = Number(row.expanded_minute);
  const isStoppage =
    (period === 1 && min === 45 && expMin > 45) ||
    (period === 2 && min === 90 && expMin > 90);

  if (isStoppage) {
    return `${pad(min)}(+${pad(expMin - min)}:${paddedSec})`;
  }
  return `${pad(min)}:${paddedSec}`;
}
