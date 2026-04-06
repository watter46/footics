import { type FlattenedEvent } from "@/lib/event-definitions";

export type MemoMode = "MATCH" | "EVENT";
export type EventPhase = 0 | 1 | 2; // 0: Time, 1: Label, 2: Memo

export interface EventSavePayload {
  type: "EVENT";
  minute: number;
  second: number;
  labels: string[];
  memo: string;
}

export interface MatchSavePayload {
  type: "MATCH";
  memo: string;
}

/**
 * 時間文字列のパース (MMSS -> M:SS)
 */
export function parseTimeStr(timeStr: string): { display: string; isInvalid: boolean; empty: boolean } {
  const digits = timeStr.replace(/\D/g, "");
  if (digits.length === 0) return { display: "--:--", isInvalid: false, empty: true };

  let m = "0";
  let s = "00";
  if (digits.length <= 2) {
    s = digits.padStart(2, "0");
  } else {
    m = digits.slice(0, -2);
    s = digits.slice(-2);
  }
  return {
    display: `${m}:${s}`,
    isInvalid: parseInt(s, 10) >= 60,
    empty: false,
  };
}

/**
 * 時間文字列から分・秒を取得
 */
export function timeStrToMinuteSecond(timeStr: string): { minute: number; second: number } {
  const digits = timeStr.replace(/\D/g, "").padStart(2, "0");
  const second = parseInt(digits.slice(-2), 10);
  const minute = parseInt(digits.slice(0, -2) || "0", 10);
  return { minute, second };
}

/**
 * バリデーション
 */
export function getValidationError(state: {
  mode: MemoMode;
  phase: EventPhase;
  timeStr: string;
  selectedLabels: string[];
}): string | null {
  const { mode, phase, timeStr, selectedLabels } = state;
  if (mode !== "EVENT") return null;

  if (phase === 0) {
    if (timeStr === "") return "時間を入力してください。";
    const { isInvalid } = parseTimeStr(timeStr);
    if (isInvalid) return "秒を59以下にして入力してください。";
  }

  if (phase === 1) {
    if (selectedLabels.length === 0) return "ラベルを1つ以上選択してください。";
  }

  return null;
}

/**
 * 保存用ペイロードの作成
 */
export function createSavePayload(state: {
  mode: MemoMode;
  timeStr: string;
  selectedLabels: string[];
  memo: string;
}): EventSavePayload | MatchSavePayload | null {
  const { mode, timeStr, selectedLabels, memo } = state;

  if (mode === "MATCH") {
    if (!memo.trim()) return null;
    return { type: "MATCH", memo: memo.trim() };
  }

  const { minute, second } = timeStrToMinuteSecond(timeStr);
  return {
    type: "EVENT",
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
  flattenedEvents: FlattenedEvent[]
): FlattenedEvent[] {
  if (!query) return flattenedEvents.slice(0, 50);
  const lowerQuery = query.toLowerCase();
  return flattenedEvents
    .filter(
      (e) =>
        e.label.toLowerCase().includes(lowerQuery) ||
        e.keywords.some((k) => k.toLowerCase().includes(lowerQuery))
    )
    .slice(0, 15);
}
