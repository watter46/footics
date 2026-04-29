import { describe, expect, it } from 'vitest';
import {
  createSavePayload,
  getValidationError,
  parseTimeStr,
} from '../memoOverlayLogic';

describe('parseTimeStr', () => {
  it('should parse empty string', () => {
    const res = parseTimeStr('');
    expect(res.display).toBe('--:--');
    expect(res.empty).toBe(true);
  });

  it("should parse '123' to '1:23'", () => {
    const res = parseTimeStr('123');
    expect(res.display).toBe('1:23');
    expect(res.isInvalid).toBe(false);
  });

  it('should detect invalid seconds', () => {
    const res = parseTimeStr('60');
    expect(res.display).toBe('0:60');
    expect(res.isInvalid).toBe(true);
  });

  it('should format extra time in 1st half (P1)', () => {
    const res = parseTimeStr('4800', 1);
    expect(res.display).toBe('45 + 3:00');
  });

  it('should format extra time in 2nd half (P2)', () => {
    const res = parseTimeStr('9200', 2);
    expect(res.display).toBe('90 + 2:00');
  });
});

describe('getValidationError', () => {
  it('should return error for empty time in EVENT mode', () => {
    const err = getValidationError({
      mode: 'EVENT',
      phase: 0,
      timeStr: '',
      selectedLabels: [],
      period: 1,
    });
    expect(err).toBe('時間を入力してください。');
  });

  it('should return null for no labels in label phase (labels are now optional)', () => {
    const err = getValidationError({
      mode: 'EVENT',
      phase: 1,
      timeStr: '123',
      selectedLabels: [],
      period: 1,
    });
    expect(err).toBeNull();
  });

  it('should return error for time before period start (e.g. 44 min in P2)', () => {
    const err = getValidationError({
      mode: 'EVENT',
      phase: 0,
      timeStr: '4400',
      selectedLabels: [],
      period: 2,
    });
    expect(err).toBe('第2ピリオドの時間は45分以降である必要があります。');
  });
});

describe('createSavePayload', () => {
  it('should create correct EVENT payload', () => {
    const payload = createSavePayload({
      mode: 'EVENT',
      period: 2,
      timeStr: '123',
      selectedLabels: ['Tag1'],
      memo: 'Test',
    });
    expect(payload).toEqual({
      type: 'EVENT',
      period: 2,
      minute: 1,
      second: 23,
      labels: ['Tag1'],
      memo: 'Test',
    });
  });
});
