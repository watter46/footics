import { create } from 'zustand';
import { getFlattenedEvents } from '@/lib/event-definitions';
import {
  type EventPhase,
  filterSuggestions,
  getValidationError,
} from '@/lib/features/memo-overlay/memoOverlayLogic';
import type { MemoOverlayState } from './memo-overlay-types';

export { useMemoOverlayDerived } from '../hooks/useMemoOverlayDerived';
export type { MemoOverlayState };

export const useMemoOverlayStore = create<MemoOverlayState>((set, get) => ({
  mode: 'EVENT',
  phase: 0,
  timeStr: '',
  selectedLabels: [],
  labelInput: '',
  suggestionIndex: 0,
  isListMode: false,
  memo: '',
  period: 1,
  error: undefined,
  isSaving: false,
  eventId: undefined,
  isModalOpen: false,

  reset: (mode) =>
    set((state) => ({
      mode: mode ?? state.mode,
      phase: 0,
      timeStr: '',
      selectedLabels: [],
      labelInput: '',
      suggestionIndex: 0,
      isListMode: false,
      memo: '',
      error: undefined,
      isSaving: false,
      eventId: undefined,
      isModalOpen: false,
    })),

  setPeriod: (val) => set({ period: val, error: undefined }),
  setTimeStr: (val) => set({ timeStr: val, error: undefined }),

  appendTimeDigit: (digit) =>
    set((state) => ({
      timeStr: (state.timeStr + digit).slice(0, 5),
      error: undefined,
    })),

  backspaceTimeStr: () =>
    set((state) => ({
      timeStr: state.timeStr.slice(0, -1),
      error: undefined,
    })),

  setLabelInput: (val) =>
    set({
      labelInput: val,
      suggestionIndex: 0,
      isListMode: false,
      error: undefined,
    }),

  addLabel: (label) =>
    set((state) => ({
      selectedLabels: state.selectedLabels.includes(label)
        ? state.selectedLabels
        : [...state.selectedLabels, label],
      labelInput: '',
      suggestionIndex: 0,
      isListMode: false,
      error: undefined,
    })),

  removeLabel: (index) =>
    set((state) => ({
      selectedLabels: state.selectedLabels.filter((_, i) => i !== index),
    })),

  backspaceLabel: () =>
    set((state) => {
      if (state.labelInput !== '') {
        return { labelInput: state.labelInput.slice(0, -1), error: undefined };
      }
      if (state.selectedLabels.length > 0) {
        const labels = [...state.selectedLabels];
        const last = labels.pop();
        return {
          selectedLabels: labels,
          labelInput: last || '',
          isListMode: false,
          error: undefined,
        };
      }
      return {};
    }),

  navigateSuggestion: (direction) =>
    set((state) => {
      const suggestions = filterSuggestions(
        state.labelInput,
        getFlattenedEvents(),
      );
      if (suggestions.length === 0) return {};

      if (!state.isListMode && direction === 1) {
        return { isListMode: true, suggestionIndex: 0 };
      }

      const next = state.suggestionIndex + direction;
      const finalIndex =
        next < 0
          ? suggestions.length - 1
          : next >= suggestions.length
            ? 0
            : next;

      return { isListMode: true, suggestionIndex: finalIndex };
    }),

  confirmSuggestion: () => {
    const { labelInput, suggestionIndex, addLabel } = get();
    const suggestions = filterSuggestions(labelInput, getFlattenedEvents());
    const target = suggestions[suggestionIndex];
    if (target) addLabel(target.label);
  },

  setMemo: (val) => set({ memo: val }),

  nextPhase: () => {
    const state = get();
    if (state.mode !== 'EVENT') return 'OK';

    if (
      state.phase === 1 &&
      (state.isListMode || state.labelInput.length > 0)
    ) {
      state.confirmSuggestion();
      return 'OK';
    }

    const vError = getValidationError({
      mode: state.mode,
      phase: state.phase,
      timeStr: state.timeStr,
      selectedLabels: state.selectedLabels,
      period: state.period,
    });

    if (vError) {
      set({ error: vError });
      return 'BLOCKED';
    }

    if (state.phase === 0) {
      set({ phase: 1 });
    } else if (state.phase === 1) {
      set({ labelInput: '', phase: 2 });
    }

    set({ error: undefined });
    return 'OK';
  },

  prevPhase: () =>
    set((state) => ({
      phase: (state.mode === 'EVENT'
        ? Math.max(0, state.phase - 1)
        : 0) as EventPhase,
      error: undefined,
    })),

  forceSetPhase: (phase) => set({ phase, error: undefined }),
  setError: (err) => set({ error: err }),
  setIsSaving: (val) => set({ isSaving: val }),

  filterByCategory: (categoryIndex) => {
    const { phase, appendTimeDigit, setLabelInput } = get();
    const cats = ['攻撃', '守備', 'トランジション', 'GK', '判定', 'メンタル'];
    set({ error: undefined });
    if (phase === 0) {
      appendTimeDigit((categoryIndex + 1).toString());
    } else if (phase === 1) {
      setLabelInput(cats[categoryIndex] ?? '');
    }
  },

  setSelectedLabels: (labels) =>
    set({ selectedLabels: labels, error: undefined }),
  setEventId: (id) => set({ eventId: id }),
  setModalOpen: (val) => set({ isModalOpen: val }),
}));
