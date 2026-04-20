import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlattenedEvent } from '@/lib/event-definitions';
import { timeStrToMinuteSecond } from '@/lib/features/MemoOverlay/utils';
import { useMemoOverlayLabels } from './useMemoOverlayLabels';
import { useMemoOverlayTime } from './useMemoOverlayTime';

export type MemoMode = 'MATCH' | 'EVENT';
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
  nextPhase: () => 'BLOCKED' | 'OK';
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
  type: 'EVENT';
  minute: number;
  second: number;
  labels: string[];
  memo: string;
}

export interface MatchSavePayload {
  type: 'MATCH';
  memo: string;
}

// =======================================
// Hook 本体
// =======================================
export function useMemoOverlay(mode: MemoMode, initialError?: string) {
  const [phase, setPhase] = useState<EventPhase>(0);
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | undefined>(initialError);
  const [isSaving, setIsSaving] = useState(false);

  // 子フックの利用
  const timeHook = useMemoOverlayTime();
  const labelHook = useMemoOverlayLabels();

  // -------------------------------------------------------
  // 最新のステートを Ref に保持（アクション関数の安定化のため）
  // -------------------------------------------------------
  const stateRef = useRef({
    mode,
    phase,
    timeStr: timeHook.timeStr,
    formattedTime: timeHook.formattedTime,
    selectedLabels: labelHook.selectedLabels,
    labelInput: labelHook.labelInput,
    suggestions: labelHook.suggestions,
    suggestionIndex: labelHook.suggestionIndex,
    isListMode: labelHook.isListMode,
    memo,
    error,
    isSaving,
  });

  useEffect(() => {
    stateRef.current = {
      mode,
      phase,
      timeStr: timeHook.timeStr,
      formattedTime: timeHook.formattedTime,
      selectedLabels: labelHook.selectedLabels,
      labelInput: labelHook.labelInput,
      suggestions: labelHook.suggestions,
      suggestionIndex: labelHook.suggestionIndex,
      isListMode: labelHook.isListMode,
      memo,
      error,
      isSaving,
    };
  }, [
    mode,
    phase,
    timeHook.timeStr,
    timeHook.formattedTime,
    labelHook.selectedLabels,
    labelHook.labelInput,
    labelHook.suggestions,
    labelHook.suggestionIndex,
    labelHook.isListMode,
    memo,
    error,
    isSaving,
  ]);

  // -------------------------------------------------------
  // Internal Helper
  // -------------------------------------------------------
  const getValidationErrorInternal = useCallback((): string | null => {
    const {
      mode: m,
      phase: p,
      timeStr: t,
      formattedTime: f,
      selectedLabels: sl,
    } = stateRef.current;
    if (m !== 'EVENT') return null;

    if (p === 0) {
      if (t === '') return '時間を入力してください。';
      if (f.isInvalid) return '秒を59以下にして入力してください。';
    }

    if (p === 1) {
      if (sl.length === 0) return 'ラベルを1つ以上選択してください。';
    }

    return null;
  }, []);

  // -------------------------------------------------------
  // Actions
  // -------------------------------------------------------
  const setTimeStrAction = useCallback(
    (val: string) => {
      timeHook.setTimeStr(val);
      setError(undefined);
    },
    [timeHook],
  );

  const appendTimeDigitAction = useCallback(
    (digit: string) => {
      setError(undefined);
      timeHook.appendTimeDigit(digit);
    },
    [timeHook],
  );

  const backspaceTimeStrAction = useCallback(() => {
    setError(undefined);
    timeHook.backspaceTimeStr();
  }, [timeHook]);

  const setLabelInputAction = useCallback(
    (val: string) => {
      labelHook.setLabelInput(val);
      setError(undefined);
    },
    [labelHook],
  );

  const addLabelAction = useCallback(
    (label: string) => {
      setError(undefined);
      labelHook.addLabel(label);
    },
    [labelHook],
  );

  const backspaceLabelAction = useCallback(() => {
    setError(undefined);
    labelHook.backspaceLabel();
  }, [labelHook]);

  const filterByCategory = useCallback(
    (categoryIndex: number) => {
      const { phase: p } = stateRef.current;
      const cats = ['攻撃', '守備', 'トランジション', 'GK', '判定', 'メンタル'];
      setError(undefined);
      if (p === 0) {
        timeHook.appendTimeDigit((categoryIndex + 1).toString());
      } else if (p === 1) {
        labelHook.setLabelInput(cats[categoryIndex] ?? '');
      }
    },
    [timeHook, labelHook],
  );

  const nextPhase = useCallback((): 'BLOCKED' | 'OK' => {
    const { mode: m, phase: p, isListMode: ilm } = stateRef.current;
    if (m !== 'EVENT') return 'OK';

    if (p === 1 && ilm) {
      labelHook.confirmSuggestion();
      return 'OK';
    }

    const vError = getValidationErrorInternal();
    if (vError) {
      setError(vError);
      return 'BLOCKED';
    }

    if (p === 0) {
      setPhase(1);
    } else if (p === 1) {
      labelHook.setLabelInput('');
      setPhase(2);
    }

    setError(undefined);
    return 'OK';
  }, [labelHook, getValidationErrorInternal]);

  const prevPhase = useCallback(() => {
    setError(undefined);
    if (mode === 'EVENT') {
      setPhase((p) => Math.max(0, p - 1) as EventPhase);
    }
  }, [mode]);

  const forceSetPhaseAction = useCallback((p: EventPhase) => {
    setError(undefined);
    setPhase(p);
  }, []);

  const validateBeforeSave = useCallback((): boolean => {
    const { mode: m, memo: me } = stateRef.current;
    if (m === 'MATCH') {
      if (!me.trim()) return false;
      return true;
    }
    const vError = getValidationErrorInternal();
    if (vError) {
      setError(vError);
      if (vError.includes('時間')) setPhase(0);
      else if (vError.includes('ラベル')) setPhase(1);
      return false;
    }
    return true;
  }, [getValidationErrorInternal]);

  const getSavePayload = useCallback(():
    | EventSavePayload
    | MatchSavePayload
    | null => {
    const {
      mode: m,
      memo: me,
      timeStr: t,
      selectedLabels: sl,
    } = stateRef.current;
    if (m === 'MATCH') {
      if (!me.trim()) return null;
      return { type: 'MATCH', memo: me };
    }
    const { minute, second } = timeStrToMinuteSecond(t);
    return { type: 'EVENT', minute, second, labels: sl, memo: me };
  }, []);

  const reset = useCallback(() => {
    setPhase(0);
    timeHook.resetTime();
    labelHook.resetLabels();
    setMemo('');
    setError(undefined);
    setIsSaving(false);
  }, [timeHook, labelHook]);

  const state: MemoOverlayState = useMemo(
    () => ({
      mode,
      phase,
      timeStr: timeHook.timeStr,
      formattedTime: timeHook.formattedTime,
      selectedLabels: labelHook.selectedLabels,
      labelInput: labelHook.labelInput,
      suggestions: labelHook.suggestions,
      suggestionIndex: labelHook.suggestionIndex,
      isListMode: labelHook.isListMode,
      isInvalidLabel: labelHook.isInvalidLabel,
      memo,
      validationError: null,
      error,
      isSaving,
    }),
    [
      mode,
      phase,
      timeHook.timeStr,
      timeHook.formattedTime,
      labelHook.selectedLabels,
      labelHook.labelInput,
      labelHook.suggestions,
      labelHook.suggestionIndex,
      labelHook.isListMode,
      labelHook.isInvalidLabel,
      memo,
      error,
      isSaving,
    ],
  );

  const actions: MemoOverlayActions = useMemo(
    () => ({
      setTimeStr: setTimeStrAction,
      appendTimeDigit: appendTimeDigitAction,
      backspaceTimeStr: backspaceTimeStrAction,
      setLabelInput: setLabelInputAction,
      addLabel: addLabelAction,
      removeLabel: labelHook.removeLabel,
      backspaceLabel: backspaceLabelAction,
      navigateSuggestion: labelHook.navigateSuggestion,
      setIsListMode: labelHook.setIsListMode,
      setSuggestionIndex: labelHook.setSuggestionIndex,
      confirmSuggestion: labelHook.confirmSuggestion,
      filterByCategory,
      setMemo,
      nextPhase,
      prevPhase,
      forceSetPhase: forceSetPhaseAction,
      setError,
      clearError: () => setError(undefined),
      setIsSaving,
      validateBeforeSave,
      getSavePayload,
      reset,
    }),
    [
      setTimeStrAction,
      appendTimeDigitAction,
      backspaceTimeStrAction,
      setLabelInputAction,
      addLabelAction,
      labelHook,
      backspaceLabelAction,
      filterByCategory,
      nextPhase,
      prevPhase,
      forceSetPhaseAction,
      validateBeforeSave,
      getSavePayload,
      reset,
    ],
  );

  return { state, actions };
}
