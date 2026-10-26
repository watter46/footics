import type { FlattenedEvent } from '@/lib/event-definitions';
import type { EventPhase } from '@/lib/features/memo-overlay/memoOverlayLogic';
import { PhaseLabelSelection } from './PhaseLabelSelection';
import { PhaseMemoInput } from './PhaseMemoInput';
import { PhaseTimeInput } from './PhaseTimeInput';

export interface MemoOverlayEventContentProps {
  phase: EventPhase;
  timeStr: string;
  displayTime: string;
  isEmptyTime: boolean;
  period: number;
  error: string | undefined;
  labelInput: string;
  suggestions: FlattenedEvent[];
  suggestionIndex: number;
  isListMode: boolean;
  isInvalidLabel: boolean;
  memo: string;
  onTimeChange: (val: string) => void;
  onPeriodChange: (val: number) => void;
  onLabelInputChange: (val: string) => void;
  onAddLabel: (label: string) => void;
  onMemoChange: (val: string) => void;
  onClose?: () => void;
  onSave?: () => void;
  onNextPhase?: () => void;
  onPrevPhase?: () => void;
  onNavigateSuggestion?: (direction: 1 | -1) => void;
}

export function MemoOverlayEventContent({
  phase,
  timeStr,
  displayTime,
  isEmptyTime,
  period,
  error,
  labelInput,
  suggestions,
  suggestionIndex,
  isListMode,
  isInvalidLabel,
  memo,
  onTimeChange,
  onPeriodChange,
  onLabelInputChange,
  onAddLabel,
  onMemoChange,
  onClose,
  onSave,
  onNextPhase,
  onPrevPhase,
  onNavigateSuggestion,
}: MemoOverlayEventContentProps) {
  switch (phase) {
    case 0:
      return (
        <PhaseTimeInput
          timeStr={timeStr}
          displayTime={displayTime}
          isEmptyTime={isEmptyTime}
          period={period}
          error={error}
          onTimeChange={onTimeChange}
          onPeriodChange={onPeriodChange}
          onClose={onClose}
          onNextPhase={onNextPhase}
        />
      );
    case 1:
      return (
        <PhaseLabelSelection
          labelInput={labelInput}
          suggestions={suggestions}
          suggestionIndex={suggestionIndex}
          isListMode={isListMode}
          isInvalidLabel={isInvalidLabel}
          phase={phase}
          validationError={error || null}
          onLabelInputChange={onLabelInputChange}
          onAddLabel={onAddLabel}
          onClose={onClose}
          onNextPhase={onNextPhase}
          onPrevPhase={onPrevPhase}
          onNavigateSuggestion={onNavigateSuggestion}
        />
      );
    case 2:
      return (
        <PhaseMemoInput
          memo={memo}
          onMemoChange={onMemoChange}
          onClose={onClose}
          onSave={onSave}
          onPrevPhase={onPrevPhase}
        />
      );
    default:
      return null;
  }
}
