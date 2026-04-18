import type { EventRow } from '@/types';

/**
 * Football match time formatter (e.g. 45:00, 45(+02:00))
 */
export function formatTimelineTime(row: EventRow): string {
  const period = Number(row.period);
  const min = Number(row.minute);
  const expMin = Number(row.expanded_minute);
  const sec = Number(row.second);

  const isStoppage =
    (period === 1 && min === 45 && expMin > 45) ||
    (period === 2 && min === 90 && expMin > 90);

  if (isStoppage) {
    const addedMin = expMin - min;
    return `${String(min).padStart(2, '0')}(+${String(addedMin).padStart(2, '0')}:${String(sec).padStart(2, '0')})`;
  }
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
