import type {
  EventPhase,
  MemoMode,
} from '@/lib/features/memo-overlay/memoOverlayLogic';

export interface MemoOverlayInitialState {
  mode?: MemoMode;
  phase?: EventPhase;
  timeStr?: string;
  selectedLabels?: string[];
  labelInput?: string;
  memo?: string;
  period?: number;
  eventId?: string;
  isModalOpen?: boolean;
}

export interface MemoOverlayState {
  mode: MemoMode;
  phase: EventPhase;
  timeStr: string;
  selectedLabels: string[];
  labelInput: string;
  suggestionIndex: number;
  isListMode: boolean;
  memo: string;
  period: number;
  error: string | undefined;
  isSaving: boolean;
  eventId: string | undefined;
  isModalOpen: boolean;

  // Actions
  reset: (mode?: MemoMode) => void;
  setPeriod: (val: number) => void;
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
  nextPhase: () => 'OK' | 'BLOCKED';
  prevPhase: () => void;
  forceSetPhase: (phase: EventPhase) => void;
  setError: (err: string | undefined) => void;
  setIsSaving: (val: boolean) => void;
  filterByCategory: (categoryIndex: number) => void;
  setSelectedLabels: (labels: string[]) => void;
  setEventId: (id: string | undefined) => void;
  setModalOpen: (val: boolean) => void;
}
