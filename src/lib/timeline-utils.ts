import type { EventRow } from '@/types';
import { PERIOD_LIMITS } from './features/memo-overlay/memoOverlayLogic';

/**
 * Football match time formatter (e.g. 45:00, 45 + 2:00)
 */
export function formatTimelineTime(row: EventRow): string {
  const period = Number(row.period);
  const min = Number(row.minute);
  const sec = Number(row.second);

  // Custom Event Mode
  if (row.source === 'custom') {
    const limit = PERIOD_LIMITS[period] || 45;
    if (min > limit && period <= 4) {
      const extra = min - limit;
      return `${limit} + ${extra}:${String(sec).padStart(2, '0')}`;
    }
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  // WhoScored Event Mode (Existing logic using expanded_minute)
  const expMin = Number(row.expanded_minute);
  const isStoppage =
    (period === 1 && min === 45 && expMin > 45) ||
    (period === 2 && min === 90 && expMin > 90);

  if (isStoppage) {
    const addedMin = expMin - min;
    return `${String(min).padStart(2, '0')}(+${String(addedMin).padStart(2, '0')}:${String(sec).padStart(2, '0')})`;
  }
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
