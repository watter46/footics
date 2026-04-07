import { create } from "zustand";
import { getFlattenedEvents } from "@/lib/event-definitions";
import { 
  type MemoMode, 
  type EventPhase, 
  parseTimeStr, 
  getValidationError, 
  filterSuggestions 
} from "@/lib/features/MemoOverlay/memoOverlayLogic";

interface MemoOverlayState {
  mode: MemoMode;
  phase: EventPhase;
  timeStr: string;
  selectedLabels: string[];
  labelInput: string;
  suggestionIndex: number;
  isListMode: boolean;
  memo: string;
  error: string | undefined;
  isSaving: boolean;

  // Actions
  reset: (mode?: MemoMode) => void;
  setTimeStr: (val: string) => void;
  appendTimeDigit: (digit: string) => void;
  backspaceTimeStr: () => void;
  setLabelInput: (val: string) => void;
  addLabel: (label: string) => void;
  removeLabel: (index: number) => void;
  backspaceLabel: () => void;
  navigateSuggestion: (direction: 1 | -1) => void;
  confirmSuggestion: () => void;
  setMemo: (val: string) => void;
  nextPhase: () => "OK" | "BLOCKED";
  prevPhase: () => void;
  forceSetPhase: (phase: EventPhase) => void;
  setError: (err: string | undefined) => void;
  setIsSaving: (val: boolean) => void;
  filterByCategory: (categoryIndex: number) => void;
}

export const useMemoOverlayStore = create<MemoOverlayState>((set, get) => ({
  mode: "EVENT",
  phase: 0,
  timeStr: "",
  selectedLabels: [],
  labelInput: "",
  suggestionIndex: 0,
  isListMode: false,
  memo: "",
  error: undefined,
  isSaving: false,

  reset: (mode) => set((state) => ({
    mode: mode ?? state.mode,
    phase: 0,
    timeStr: "",
    selectedLabels: [],
    labelInput: "",
    suggestionIndex: 0,
    isListMode: false,
    memo: "",
    error: undefined,
    isSaving: false,
  })),

  setTimeStr: (val) => set({ timeStr: val, error: undefined }),

  appendTimeDigit: (digit) => set((state) => ({
    timeStr: (state.timeStr + digit).slice(0, 5),
    error: undefined,
  })),

  backspaceTimeStr: () => set((state) => ({
    timeStr: state.timeStr.slice(0, -1),
    error: undefined,
  })),

  setLabelInput: (val) => set({ 
    labelInput: val, 
    suggestionIndex: 0, 
    isListMode: false, 
    error: undefined 
  }),

  addLabel: (label) => set((state) => ({
    selectedLabels: state.selectedLabels.includes(label) 
      ? state.selectedLabels 
      : [...state.selectedLabels, label],
    labelInput: "",
    suggestionIndex: 0,
    isListMode: false,
    error: undefined,
  })),

  removeLabel: (index) => set((state) => ({
    selectedLabels: state.selectedLabels.filter((_, i) => i !== index),
  })),

  backspaceLabel: () => set((state) => {
    if (state.labelInput !== "") {
      return { labelInput: state.labelInput.slice(0, -1), error: undefined };
    } else if (state.selectedLabels.length > 0) {
      const labels = [...state.selectedLabels];
      const last = labels.pop();
      return { 
        selectedLabels: labels, 
        labelInput: last || "", 
        isListMode: false,
        error: undefined
      };
    }
    return {};
  }),

  navigateSuggestion: (direction) => set((state) => {
    const suggestions = filterSuggestions(state.labelInput, getFlattenedEvents());
    if (suggestions.length === 0) return {};

    if (!state.isListMode && direction === 1) {
      return { isListMode: true, suggestionIndex: 0 };
    }

    const next = state.suggestionIndex + direction;
    const finalIndex = next < 0 ? suggestions.length - 1 : (next >= suggestions.length ? 0 : next);
    
    return { isListMode: true, suggestionIndex: finalIndex };
  }),

  confirmSuggestion: () => {
    const { labelInput, suggestionIndex, addLabel } = get();
    const suggestions = filterSuggestions(labelInput, getFlattenedEvents());
    const target = suggestions[suggestionIndex];
    if (target) {
      addLabel(target.label);
    }
  },

  setMemo: (val) => set({ memo: val }),

  nextPhase: () => {
    const state = get();
    if (state.mode !== "EVENT") return "OK";

    if (state.phase === 1 && state.isListMode) {
      state.confirmSuggestion();
      return "OK";
    }

    const vError = getValidationError({
      mode: state.mode,
      phase: state.phase,
      timeStr: state.timeStr,
      selectedLabels: state.selectedLabels,
    });

    if (vError) {
      set({ error: vError });
      return "BLOCKED";
    }

    if (state.phase === 0) {
      set({ phase: 1 });
    } else if (state.phase === 1) {
      set({ labelInput: "", phase: 2 });
    }
    
    set({ error: undefined });
    return "OK";
  },

  prevPhase: () => set((state) => ({
    phase: (state.mode === "EVENT" ? Math.max(0, state.phase - 1) : 0) as EventPhase,
    error: undefined,
  })),

  forceSetPhase: (phase) => set({ phase, error: undefined }),

  setError: (err) => set({ error: err }),

  setIsSaving: (val) => set({ isSaving: val }),

  filterByCategory: (categoryIndex) => {
    const { phase, appendTimeDigit, setLabelInput } = get();
    const cats = ["攻撃", "守備", "トランジション", "GK", "判定", "メンタル"];
    set({ error: undefined });
    if (phase === 0) {
      appendTimeDigit((categoryIndex + 1).toString());
    } else if (phase === 1) {
      setLabelInput(cats[categoryIndex] ?? "");
    }
  },
}));

/**
 * Derived State Selectors (Optional for convenience)
 */
export const useMemoOverlayDerived = () => {
  const store = useMemoOverlayStore();
  const flattenedEvents = getFlattenedEvents();

  const formattedTime = parseTimeStr(store.timeStr);
  const suggestions = filterSuggestions(store.labelInput, flattenedEvents);
  
  const isInvalidLabel = store.labelInput 
    ? !suggestions.some((s) => s.label.toLowerCase() === store.labelInput.toLowerCase())
    : false;

  const clearError = () => store.setError(undefined);

  return {
    ...store,
    formattedTime,
    suggestions,
    isInvalidLabel,
    clearError,
  };
};
