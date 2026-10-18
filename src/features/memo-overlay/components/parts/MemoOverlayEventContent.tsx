import type React from 'react';
import type { FlattenedEvent } from '@/lib/event-definitions';
import type { EventPhase } from '@/lib/features/memo-overlay/memoOverlayLogic';
import { PhaseLabelSelection } from './PhaseLabelSelection';
import { PhaseMemoInput } from './PhaseMemoInput';
import { PhaseTimeInput } from './PhaseTimeInput';

interface MemoOverlayEventContentProps {
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
}

export const MemoOverlayEventContent: React.FC<
  MemoOverlayEventContentProps
> = ({
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
}) => {
  switch (phase) {
    case 0:
      return (
        <PhaseTimeInput
          timeStr={timeStr}
          displayTime={displayTime}
          isEmpty={isEmptyTime}
          phase={phase}
          period={period}
          validationError={error || null}
          onTimeChange={onTimeChange}
          onPeriodChange={onPeriodChange}
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
        />
      );
    case 2:
      return <PhaseMemoInput memo={memo} onMemoChange={onMemoChange} />;
    default:
      return null;
  }
};
