import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Save,
  X,
} from 'lucide-react';
import type React from 'react';
import { useMemoOverlayDerived } from '@/stores/useMemoOverlayStore';
import { MatchMemoUnit } from './parts/MatchMemoUnit';
import { MemoOverlayHeader } from './parts/MemoOverlayHeader';
import {
  MemoOverlayProgressBar,
  MemoOverlayRecap,
} from './parts/MemoOverlayProgress';
import { PhaseLabelSelection } from './parts/PhaseLabelSelection';
import { PhaseMemoInput } from './parts/PhaseMemoInput';
import { PhaseTimeInput } from './parts/PhaseTimeInput';

const UI_VERSION = '0.2.1';

interface MemoOverlayViewProps {
  matchId: string | undefined;
  onClose: () => void;
  onSave: () => void;
}

/**
 * MemoOverlayView
 * 責務: MemoOverlayの全体レイアウトのオーケストレーター。
 * - Zustand ストアから状態を取得
 * - ヘッダー、進捗バー、フッターナビゲーションを提供
 * - 各フェーズの描画をサブコンポーネントへ委譲
 */
export const MemoOverlayView: React.FC<MemoOverlayViewProps> = ({
  matchId,
  onClose,
  onSave,
}) => {
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
    error,
    isSaving,

    // Actions
    setTimeStr,
    addLabel,
    removeLabel,
    setLabelInput,
    setMemo,
    nextPhase,
    prevPhase,
    clearError,
  } = useMemoOverlayDerived();

  // フェーズごとのコンテンツを返す
  const renderEventPhaseContent = () => {
    switch (phase) {
      case 0:
        return (
          <PhaseTimeInput
            timeStr={timeStr}
            displayTime={formattedTime.display}
            isInvalid={formattedTime.isInvalid}
            isEmpty={formattedTime.empty}
            phase={phase}
            validationError={error || null}
            onTimeChange={setTimeStr}
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
            onLabelInputChange={setLabelInput}
            onAddLabel={addLabel}
          />
        );
      case 2:
        return (
          <PhaseMemoInput memo={memo} onMemoChange={setMemo} onSave={onSave} />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed top-6 right-6 w-[22vw] min-w-[380px] aspect-[1/1.3] bg-slate-900 border border-slate-700/60 rounded-xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden font-sans animate-in slide-in-from-right-4 duration-500 flex flex-col"
      onKeyDown={(e) => e.stopPropagation()}
    >
      {/* ── ヘッダー ── */}
      <MemoOverlayHeader mode={mode} phase={phase} onClose={onClose} />

      {/* ── イベントモード: 進捗バー & レキャップ ── */}
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

      {/* ── ボディ（フェーズコンテンツ） ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
        `}</style>
        {mode === 'MATCH' ? (
          <MatchMemoUnit
            memo={memo}
            isSaving={isSaving}
            hasMatchId={!!matchId}
            onMemoChange={setMemo}
            onSave={onSave}
          />
        ) : (
          renderEventPhaseContent()
        )}
      </div>

      {/* ── イベントモード: フッターナビゲーション ── */}
      {mode === 'EVENT' && (
        <div className="flex-shrink-0 px-5 py-4 bg-slate-950/30 border-t border-slate-800/50 flex justify-between items-center">
          <div className="flex gap-3">
            {phase > 0 && (
              <button
                onClick={prevPhase}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-slate-100 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> BACK
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {phase < 2 ? (
              <button
                onClick={nextPhase}
                className="flex items-center gap-1.5 px-5 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-black text-slate-100 transition-all shadow-xl"
              >
                NEXT <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-black transition-all shadow-xl shadow-amber-900/20"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                PERSIST EVENT
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── フッター: Instance Info ── */}
      <div className="flex-shrink-0 px-5 py-2 bg-slate-950 flex items-center justify-between font-mono">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-[9px] text-slate-300 font-bold uppercase truncate">
            Target: {matchId || 'No Instance Connected'}
          </span>
        </div>
        <div className="text-[9px] font-black text-slate-200 tracking-tighter">
          CENTRAL FOCUS CORE v{UI_VERSION}
        </div>
      </div>

      {/* ── フローティングエラー ── */}
      {error && (
        <div className="absolute inset-x-0 bottom-12 p-3 bg-red-950/90 border-y border-red-500/30 flex items-center gap-3 backdrop-blur-lg animate-in slide-in-from-bottom-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-200 font-bold leading-tight">
            {error}
          </p>
          <button onClick={clearError} className="ml-auto text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
