import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useMemoOverlayStoreContext } from '../stores/memo-overlay-provider';
import { useMemoOverlayDerived } from '../stores/memo-overlay-store';
import { MatchMemoUnit } from './parts/MatchMemoUnit';
import { MemoOverlayEventContent } from './parts/MemoOverlayEventContent';
import { MemoOverlayFloatingError } from './parts/MemoOverlayFloatingError';
import { MemoOverlayFooterNav } from './parts/MemoOverlayFooterNav';
import { MemoOverlayHeader } from './parts/MemoOverlayHeader';
import { MemoOverlayInstanceBar } from './parts/MemoOverlayInstanceBar';
import {
  MemoOverlayProgressBar,
  MemoOverlayRecap,
} from './parts/MemoOverlayProgress';

const UI_VERSION = '0.2.2';

export interface MemoOverlayViewProps {
  matchId: string | undefined;
  initialMemo?: string;
  initialData?: {
    memo?: string;
    [key: string]: unknown;
  };
  onClose: () => void;
  onSave: () => void;
  className?: string;
  readOnly?: boolean;
}

/**
 * MemoOverlayView
 * 責務: MemoOverlayの全体レイアウトのオーケストレーター（Level 2 Domain UI Block）。
 * - ホストAPI非依存（純粋UI）
 * - 初期メモは Props (initialMemo / initialData.memo) より確定注入
 * - 各フェーズの描画をサブコンポーネントへ委譲
 */
export function MemoOverlayView({
  matchId,
  initialMemo,
  initialData,
  onClose,
  onSave,
  className,
  readOnly = false,
}: MemoOverlayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialRef = useRef(true);

  const {
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
    period,
    error,
    isSaving,
    setTimeStr,
    setPeriod,
    addLabel,
    removeLabel,
    setLabelInput,
    setMemo,
    nextPhase,
    prevPhase,
    navigateSuggestion,
    clearError,
  } = useMemoOverlayDerived();

  const initialMemoText = initialMemo ?? initialData?.memo;
  const currentMemo = useMemoOverlayStoreContext((s) => s.memo);

  // Props 確定注入: 初期メモをストアへ同期（Flickerゼロ）
  useEffect(() => {
    if (initialMemoText !== undefined && !currentMemo) {
      setMemo(initialMemoText);
    }
    isInitialRef.current = false;
  }, [initialMemoText, setMemo, currentMemo]);

  const activeMemo =
    isInitialRef.current && !memo ? (initialMemoText ?? '') : memo;

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-label="Memo Overlay"
      className={cn(
        'fixed top-6 right-6 w-[22vw] min-w-[380px] aspect-[1/1.3] bg-surface-l3 border border-white/[0.08] rounded-xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden font-sans flex flex-col outline-none',
        className,
      )}
      onKeyDown={(e) => {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return;
        }
        e.stopPropagation();
      }}
    >
      <MemoOverlayHeader
        mode={mode}
        phase={phase}
        period={period}
        onClose={onClose}
      />

      {mode === 'EVENT' && (
        <>
          <MemoOverlayProgressBar phase={phase} />
          <MemoOverlayRecap
            phase={phase}
            displayTime={formattedTime.display}
            selectedLabels={selectedLabels}
            onRemoveLabel={removeLabel}
          />
        </>
      )}

      <div className="flex-1 overflow-y-auto">
        {mode === 'MATCH' ? (
          <MatchMemoUnit
            memo={activeMemo}
            isSaving={isSaving}
            hasMatchId={!!matchId}
            onMemoChange={setMemo}
            onSave={onSave}
            readOnly={readOnly}
            onClose={onClose}
          />
        ) : (
          <MemoOverlayEventContent
            phase={phase}
            timeStr={timeStr}
            displayTime={formattedTime.display}
            isEmptyTime={formattedTime.empty}
            period={period}
            error={error}
            labelInput={labelInput}
            suggestions={suggestions}
            suggestionIndex={suggestionIndex}
            isListMode={isListMode}
            isInvalidLabel={isInvalidLabel}
            memo={memo}
            onTimeChange={setTimeStr}
            onPeriodChange={setPeriod}
            onLabelInputChange={setLabelInput}
            onAddLabel={addLabel}
            onMemoChange={setMemo}
            onClose={onClose}
            onSave={onSave}
            onNextPhase={nextPhase}
            onPrevPhase={prevPhase}
            onNavigateSuggestion={navigateSuggestion}
          />
        )}
      </div>

      {mode === 'EVENT' && (
        <MemoOverlayFooterNav
          phase={phase}
          isSaving={isSaving}
          onPrevPhase={prevPhase}
          onNextPhase={nextPhase}
          onSave={onSave}
        />
      )}

      <MemoOverlayInstanceBar matchId={matchId} uiVersion={UI_VERSION} />
      <MemoOverlayFloatingError error={error} onClear={clearError} />
    </div>
  );
}
