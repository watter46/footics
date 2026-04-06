import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { getFlattenedEvents, type FlattenedEvent } from "@/lib/event-definitions";

export type MemoMode = "MATCH" | "EVENT";
export type EventPhase = 0 | 1 | 2; // 0: Time, 1: Label, 2: Memo

// Hook が外部に公開するデータ型
export interface MemoOverlayState {
  mode: MemoMode;
  phase: EventPhase;
  // 時間
  timeStr: string;
  formattedTime: { display: string; isInvalid: boolean; empty: boolean };
  // ラベル
  selectedLabels: string[];
  labelInput: string;
  suggestions: FlattenedEvent[];
  suggestionIndex: number;
  isListMode: boolean;
  isInvalidLabel: boolean;
  // メモ
  memo: string;
  // エラー
  validationError: string | null;
  error: string | undefined;
  // 保存中フラグ
  isSaving: boolean;
}

// Hook が外部に公開するアクション型
export interface MemoOverlayActions {
  // 時間
  setTimeStr: (val: string) => void;
  appendTimeDigit: (digit: string) => void;
  backspaceTimeStr: () => void;
  // ラベル
  setLabelInput: (val: string) => void;
  addLabel: (label: string) => void;
  removeLabel: (index: number) => void;
  backspaceLabel: () => void;
  navigateSuggestion: (direction: 1 | -1) => void;
  setIsListMode: (val: boolean) => void;
  setSuggestionIndex: (val: number) => void;
  confirmSuggestion: () => void;
  filterByCategory: (categoryIndex: number) => void;
  // メモ
  setMemo: (val: string) => void;
  // フェーズ
  nextPhase: () => "BLOCKED" | "OK";
  prevPhase: () => void;
  forceSetPhase: (phase: EventPhase) => void;
  // エラー
  setError: (err: string | undefined) => void;
  clearError: () => void;
  // 保存
  setIsSaving: (val: boolean) => void;
  // 保存前の横断バリデーション（失敗時はエラーをセットして false を返す）
  validateBeforeSave: () => boolean;
  // 保存用データの取得
  getSavePayload: () => EventSavePayload | MatchSavePayload | null;
  // リセット
  reset: () => void;
}

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

// =======================================
// ユーティリティ: 時間文字列のパース
// =======================================
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

export function timeStrToMinuteSecond(timeStr: string): { minute: number; second: number } {
  const digits = timeStr.replace(/\D/g, "").padStart(2, "0");
  const second = parseInt(digits.slice(-2), 10);
  const minute = parseInt(digits.slice(0, -2) || "0", 10);
  return { minute, second };
}

// =======================================
// Hook 本体
// =======================================
export function useMemoOverlay(mode: MemoMode, initialError?: string) {
  const [phase, setPhase] = useState<EventPhase>(0);
  const [timeStr, setTimeStr] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isListMode, setIsListMode] = useState(false);
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | undefined>(initialError);
  const [isSaving, setIsSaving] = useState(false);

  // -------------------------------------------------------
  // Derived State
  // -------------------------------------------------------
  const formattedTime = useMemo(() => parseTimeStr(timeStr), [timeStr]);
  const flattenedEvents = useMemo(() => getFlattenedEvents(), []);

  const suggestions = useMemo<FlattenedEvent[]>(() => {
    if (!labelInput) return flattenedEvents.slice(0, 50);
    const query = labelInput.toLowerCase();
    return flattenedEvents
      .filter(
        (e) =>
          e.label.toLowerCase().includes(query) ||
          e.keywords.some((k) => k.toLowerCase().includes(query))
      )
      .slice(0, 15);
  }, [labelInput, flattenedEvents]);

  const isInvalidLabel = useMemo(() => {
    if (!labelInput) return false;
    return !suggestions.some((s) => s.label.toLowerCase() === labelInput.toLowerCase());
  }, [labelInput, suggestions]);

  // -------------------------------------------------------
  // 最新のステートを Ref に保持（アクション関数の安定化のため）
  // -------------------------------------------------------
  const stateRef = useRef({
    mode, phase, timeStr, formattedTime, 
    selectedLabels, labelInput, suggestions, suggestionIndex, 
    isListMode, memo, error, isSaving
  });

  useEffect(() => {
    stateRef.current = {
      mode, phase, timeStr, formattedTime, 
      selectedLabels, labelInput, suggestions, suggestionIndex, 
      isListMode, memo, error, isSaving
    };
  }, [mode, phase, timeStr, formattedTime, selectedLabels, labelInput, suggestions, suggestionIndex, isListMode, memo, error, isSaving]);

  // -------------------------------------------------------
  // Internal Helper
  // -------------------------------------------------------
  const getValidationErrorInternal = useCallback((): string | null => {
    const { mode: m, phase: p, timeStr: t, formattedTime: f, selectedLabels: s } = stateRef.current;
    if (m !== "EVENT") return null;
    
    if (p === 0) {
      if (t === "") return "時間を入力してください。";
      if (f.isInvalid) return "秒を59以下にして入力してください。";
    }
    
    if (p === 1) {
      if (s.length === 0) return "ラベルを1つ以上選択してください。";
    }
    
    return null;
  }, []);

  // -------------------------------------------------------
  // Actions
  // -------------------------------------------------------
  const setTimeStrAction = useCallback((val: string) => {
    setTimeStr(val);
    setError(undefined);
  }, []);

  const appendTimeDigit = useCallback((digit: string) => {
    setError(undefined);
    setTimeStr((prev) => (prev + digit).slice(0, 5));
  }, []);

  const backspaceTimeStr = useCallback(() => {
    setError(undefined);
    setTimeStr((prev) => prev.slice(0, -1));
  }, []);

  const setLabelInputAction = useCallback((val: string) => {
    setLabelInput(val);
    setSuggestionIndex(0);
    setIsListMode(false);
    setError(undefined);
  }, []);

  const addLabel = useCallback((label: string) => {
    setError(undefined);
    setSelectedLabels((prev) => (prev.includes(label) ? prev : [...prev, label]));
    setLabelInput("");
    setSuggestionIndex(0);
    setIsListMode(false);
  }, []);

  const removeLabel = useCallback((index: number) => {
    setSelectedLabels((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const backspaceLabel = useCallback(() => {
    setError(undefined);
    const { labelInput: li, selectedLabels: sl } = stateRef.current;
    if (li !== "") {
      setLabelInput((prev) => prev.slice(0, -1));
    } else if (sl.length > 0) {
      setSelectedLabels((prev) => {
        const labels = [...prev];
        const last = labels.pop();
        if (last) setLabelInput(last);
        return labels;
      });
      setIsListMode(false);
    }
  }, []);

  const navigateSuggestion = useCallback((direction: 1 | -1) => {
    const { suggestions: s, isListMode: ilm } = stateRef.current;
    if (s.length === 0) return;

    // 初めてリストモードに入る時（↓キー）は、0番目から開始するように強制
    if (!ilm && direction === 1) {
      setIsListMode(true);
      setSuggestionIndex(0);
      return;
    }

    setIsListMode(true);
    setSuggestionIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return s.length - 1;
      if (next >= s.length) return 0;
      return next;
    });
  }, []);

  const confirmSuggestion = useCallback(() => {
    const { suggestions: s, suggestionIndex: si } = stateRef.current;
    const target = s[si];
    if (target) {
      addLabel(target.label);
      setError(undefined);
    }
  }, [addLabel]);

  const filterByCategory = useCallback((categoryIndex: number) => {
    const { phase: p } = stateRef.current;
    const cats = ["攻撃", "守備", "トランジション", "GK", "判定", "メンタル"];
    setError(undefined);
    if (p === 0) {
      appendTimeDigit((categoryIndex + 1).toString());
    } else if (p === 1) {
      setLabelInput(cats[categoryIndex] ?? "");
      setSuggestionIndex(0);
      setIsListMode(false);
    }
  }, [appendTimeDigit]);

  const nextPhase = useCallback((): "BLOCKED" | "OK" => {
    const { mode: m, phase: p, isListMode: ilm } = stateRef.current;
    if (m !== "EVENT") return "OK";

    if (p === 1 && ilm) {
      confirmSuggestion();
      return "OK";
    }

    const vError = getValidationErrorInternal();
    if (vError) {
      setError(vError);
      return "BLOCKED";
    }

    if (p === 0) {
      setPhase(1);
    } else if (p === 1) {
      setLabelInput("");
      setPhase(2);
    }
    
    setError(undefined);
    return "OK";
  }, [confirmSuggestion, getValidationErrorInternal]);

  const prevPhase = useCallback(() => {
    const { mode: m } = stateRef.current;
    setError(undefined);
    if (m === "EVENT") {
      setPhase((p) => (Math.max(0, p - 1) as EventPhase));
    }
  }, []);

  const forceSetPhase = useCallback((p: EventPhase) => {
    setError(undefined);
    setPhase(p);
  }, []);

  const clearError = useCallback(() => setError(undefined), []);

  const validateBeforeSave = useCallback((): boolean => {
    const { mode: m, memo: me } = stateRef.current;
    if (m === "MATCH") {
      if (!me.trim()) return false;
      return true;
    }
    const vError = getValidationErrorInternal();
    if (vError) {
      setError(vError);
      if (vError.includes("時間")) setPhase(0);
      else if (vError.includes("ラベル")) setPhase(1);
      return false;
    }
    return true;
  }, [getValidationErrorInternal]);

  const getSavePayload = useCallback((): EventSavePayload | MatchSavePayload | null => {
    const { mode: m, memo: me, timeStr: t, selectedLabels: sl } = stateRef.current;
    if (m === "MATCH") {
      if (!me.trim()) return null;
      return { type: "MATCH", memo: me };
    }
    const { minute, second } = timeStrToMinuteSecond(t);
    return { type: "EVENT", minute, second, labels: sl, memo: me };
  }, []);

  const reset = useCallback(() => {
    setPhase(0);
    setTimeStr("");
    setSelectedLabels([]);
    setLabelInput("");
    setSuggestionIndex(0);
    setIsListMode(false);
    setMemo("");
    setError(undefined);
    setIsSaving(false);
  }, []);

  const setMemoAction = useCallback((val: string) => setMemo(val), []);

  // -------------------------------------------------------
  // Return
  // -------------------------------------------------------
  const state: MemoOverlayState = useMemo(() => ({
    mode,
    phase,
    timeStr,
    formattedTime,
    selectedLabels,
    labelInput,
    suggestions,
    suggestionIndex,
    isListMode,
    isInvalidLabel,
    memo,
    validationError: null,
    error,
    isSaving,
  }), [
    mode, phase, timeStr, formattedTime, selectedLabels,
    labelInput, suggestions, suggestionIndex, isListMode,
    isInvalidLabel, memo, error, isSaving
  ]);

  const actions: MemoOverlayActions = useMemo(() => ({
    setTimeStr: setTimeStrAction,
    appendTimeDigit,
    backspaceTimeStr,
    setLabelInput: setLabelInputAction,
    addLabel,
    removeLabel,
    backspaceLabel,
    navigateSuggestion,
    setIsListMode,
    setSuggestionIndex,
    confirmSuggestion,
    filterByCategory,
    setMemo: setMemoAction,
    nextPhase,
    prevPhase,
    forceSetPhase,
    setError,
    clearError,
    setIsSaving,
    validateBeforeSave,
    getSavePayload,
    reset,
  }), [
    setTimeStrAction, appendTimeDigit, backspaceTimeStr, setLabelInputAction,
    addLabel, removeLabel, backspaceLabel, navigateSuggestion,
    confirmSuggestion, filterByCategory, setMemoAction,
    nextPhase, prevPhase, forceSetPhase, clearError,
    validateBeforeSave, getSavePayload, reset
  ]);

  return { state, actions };
}
