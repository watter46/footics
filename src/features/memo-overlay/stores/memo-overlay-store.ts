import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { getFlattenedEvents } from '@/lib/event-definitions';
import {
  type EventPhase,
  filterSuggestions,
  getValidationError,
} from '@/lib/features/memo-overlay/memoOverlayLogic';
import type { MemoOverlayState } from './memo-overlay-types';

export { useMemoOverlayDerived } from '../hooks/useMemoOverlayDerived';
export type { MemoOverlayState };

const DEFAULT_STATE = {
  mode: 'EVENT' as const,
  phase: 0 as const,
  timeStr: '',
  selectedLabels: [] as string[],
  labelInput: '',
  suggestionIndex: 0,
  isListMode: false,
  memo: '',
  period: 1,
  error: undefined,
  isSaving: false,
  eventId: undefined,
  isModalOpen: false,
};

export type MemoOverlayStore = ReturnType<typeof createMemoOverlayStore>;

export function createMemoOverlayStore(
  initialState?: Partial<MemoOverlayState>,
) {
  return createStore<MemoOverlayState>()((set, get) => ({
    ...DEFAULT_STATE,
    ...initialState,

    reset: (mode) =>
      set((state) => ({
        ...DEFAULT_STATE,
        mode: mode ?? state.mode,
        period: state.period,
      })),

    setPeriod: (val) => set({ period: val, error: undefined }),
    setTimeStr: (val) => set({ timeStr: val, error: undefined }),

    appendTimeDigit: (digit) =>
      set((s) => ({
        timeStr: (s.timeStr + digit).slice(0, 5),
        error: undefined,
      })),

    backspaceTimeStr: () =>
      set((s) => ({ timeStr: s.timeStr.slice(0, -1), error: undefined })),

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
          return {
            labelInput: state.labelInput.slice(0, -1),
            error: undefined,
          };
        }
        if (state.selectedLabels.length > 0) {
          return {
            selectedLabels: state.selectedLabels.slice(0, -1),
            labelInput: state.selectedLabels.at(-1) || '',
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
        const len = suggestions.length;
        return { isListMode: true, suggestionIndex: (next + len) % len };
      }),

    confirmSuggestion: () => {
      const { labelInput, suggestionIndex, addLabel } = get();
      const target = filterSuggestions(labelInput, getFlattenedEvents())[
        suggestionIndex
      ];
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

      if (state.phase === 0) set({ phase: 1 });
      else if (state.phase === 1) set({ labelInput: '', phase: 2 });

      set({ error: undefined });
      return 'OK';
    },

    prevPhase: () =>
      set((s) => ({
        phase: (s.mode === 'EVENT'
          ? Math.max(0, s.phase - 1)
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
      if (phase === 0) appendTimeDigit((categoryIndex + 1).toString());
      else if (phase === 1) setLabelInput(cats[categoryIndex] ?? '');
    },

    setSelectedLabels: (labels) =>
      set({ selectedLabels: labels, error: undefined }),
    setEventId: (id) => set({ eventId: id }),
    setModalOpen: (val) => set({ isModalOpen: val }),
  }));
}

export const defaultMemoOverlayStore = createMemoOverlayStore();

export type UseMemoOverlayStore = {
  (): MemoOverlayState;
  <T>(selector: (state: MemoOverlayState) => T): T;
} & MemoOverlayStore;

export const useMemoOverlayStore = Object.assign(
  <T = MemoOverlayState>(selector?: (state: MemoOverlayState) => T) =>
    useStore(defaultMemoOverlayStore, selector ?? ((s) => s as unknown as T)),
  defaultMemoOverlayStore,
) as UseMemoOverlayStore;
