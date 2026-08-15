import { describe, it, expect } from 'vitest';
import { formatTimelineTime } from './timeline-utils';
import type { EventRow } from '@/types';

describe('formatTimelineTime', () => {
  const createEvent = (overrides: Partial<EventRow>): EventRow => ({
    period: 1,
    minute: 10,
    second: 5,
    expanded_minute: 10,
    source: 'whoscored',
    ...overrides,
  } as EventRow);

  it('formats normal whoscored event correctly', () => {
    const event = createEvent({ minute: 15, second: 30 });
    expect(formatTimelineTime(event)).toBe('15:30');
  });

  it('pads single digit minutes and seconds', () => {
    const event = createEvent({ minute: 5, second: 9 });
    expect(formatTimelineTime(event)).toBe('05:09');
  });

  it('formats first half stoppage time correctly (whoscored)', () => {
    // period 1, minute 45, expMin > 45
    const event = createEvent({ period: 1, minute: 45, expanded_minute: 47, second: 12 });
    expect(formatTimelineTime(event)).toBe('45(+02:12)');
  });

  it('formats second half stoppage time correctly (whoscored)', () => {
    // period 2, minute 90, expMin > 90
    const event = createEvent({ period: 2, minute: 90, expanded_minute: 95, second: 4 });
    expect(formatTimelineTime(event)).toBe('90(+05:04)');
  });

  it('formats normal custom event correctly', () => {
    const event = createEvent({ source: 'custom', period: 1, minute: 12, second: 34 });
    expect(formatTimelineTime(event)).toBe('12:34');
  });

  it('formats first half stoppage time correctly (custom)', () => {
    // custom event in period 1 past 45 mins
    const event = createEvent({ source: 'custom', period: 1, minute: 47, second: 10 });
    expect(formatTimelineTime(event)).toBe('45 + 2:10');
  });

  it('formats second half stoppage time correctly (custom)', () => {
    // custom event in period 2 past 90 mins (limit is 90 for period 2)
    const event = createEvent({ source: 'custom', period: 2, minute: 93, second: 5 });
    expect(formatTimelineTime(event)).toBe('90 + 3:05');
  });
});
