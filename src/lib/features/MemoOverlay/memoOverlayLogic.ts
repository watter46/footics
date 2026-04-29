import type { FlattenedEvent } from '@/lib/event-definitions';

export type MemoMode = 'MATCH' | 'EVENT';
export type EventPhase = 0 | 1 | 2; // 0: Time, 1: Label, 2: Memo

export interface EventSavePayload {
  type: 'EVENT';
  period: number;
  minute: number;
  second: number;
  labels: string[];
  memo: string;
}

export interface MatchSavePayload {
  type: 'MATCH';
  memo: string;
}

/**
 * Match period limits (minutes)
 */
export const PERIOD_LIMITS: Record<number, number> = {
  1: 45,
  2: 90,
  3: 105,
  4: 120,
  5: 999, // PK: No practical limit for display
};

/**
 * 時間文字列のパース (MMSS -> M:SS or M+A:SS)
 */
export function parseTimeStr(
  timeStr: string,
  period = 1,
): {
  display: string;
  isInvalid: boolean;
  empty: boolean;
} {
  const digits = timeStr.replace(/\D/g, '');
  if (digits.length === 0)
    return { display: '--:--', isInvalid: false, empty: true };

  let m = 0;
  let s = 0;
  if (digits.length <= 2) {
    s = parseInt(digits, 10);
  } else {
    m = parseInt(digits.slice(0, -2), 10);
    s = parseInt(digits.slice(-2), 10);
  }

  const limit = PERIOD_LIMITS[period] || 45;
  let displayTime = '';

  if (m > limit && period <= 4) {
    const extra = m - limit;
    displayTime = `${limit} + ${extra}:${s.toString().padStart(2, '0')}`;
  } else {
    displayTime = `${m}:${s.toString().padStart(2, '0')}`;
  }

  return {
    display: displayTime,
    isInvalid: s >= 60,
    empty: false,
  };
}

/**
 * 時間文字列から分・秒を取得
 */
export function timeStrToMinuteSecond(timeStr: string): {
  minute: number;
  second: number;
} {
  const digits = timeStr.replace(/\D/g, '').padStart(2, '0');
  const second = parseInt(digits.slice(-2), 10);
  const minute = parseInt(digits.slice(0, -2) || '0', 10);
  return { minute, second };
}

/**
 * Minimum minutes allowed per period (standard elapsed time)
 */
export const MIN_MINUTES_PER_PERIOD: Record<number, number> = {
  1: 0,
  2: 45,
  3: 90,
  4: 105,
  5: 0, // PK: No specific start time
};

/**
 * バリデーション
 */
export function getValidationError(state: {
  mode: MemoMode;
  phase: EventPhase;
  timeStr: string;
  selectedLabels: string[];
  period: number;
}): string | null {
  const { mode, phase, timeStr, selectedLabels, period } = state;
  if (mode !== 'EVENT') return null;

  if (phase === 0) {
    if (timeStr === '') return '時間を入力してください。';
    const { isInvalid } = parseTimeStr(timeStr, period);
    if (isInvalid) return '秒を59以下にして入力してください。';

    const { minute } = timeStrToMinuteSecond(timeStr);
    const minLimit = MIN_MINUTES_PER_PERIOD[period] || 0;
    if (minute < minLimit) {
      return `第${period}ピリオドの時間は${minLimit}分以降である必要があります。`;
    }
  }

  return null;
}

/**
 * 保存用ペイロードの作成
 */
export function createSavePayload(state: {
  mode: MemoMode;
  period: number;
  timeStr: string;
  selectedLabels: string[];
  memo: string;
}): EventSavePayload | MatchSavePayload | null {
  const { mode, period, timeStr, selectedLabels, memo } = state;

  if (mode === 'MATCH') {
    return { type: 'MATCH', memo: memo.trim() };
  }

  const { minute, second } = timeStrToMinuteSecond(timeStr);
  return {
    type: 'EVENT',
    period,
    minute,
    second,
    labels: selectedLabels,
    memo: memo.trim(),
  };
}

/**
 * ラベルのサジェストフィルタ
 */
export function filterSuggestions(
  query: string,
  flattenedEvents: FlattenedEvent[],
): FlattenedEvent[] {
  if (!query) return flattenedEvents.slice(0, 50);
  const lowerQuery = query.toLowerCase();
  return flattenedEvents
    .filter(
      (e) =>
        e.label.toLowerCase().includes(lowerQuery) ||
        e.keywords.some((k) => k.toLowerCase().includes(lowerQuery)),
    )
    .slice(0, 15);
}
