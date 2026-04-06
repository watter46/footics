"use client";

import React from "react";
import {
  Edit3,
  X,
  Info,
  AlertCircle,
  Save,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type { MemoOverlayState, MemoOverlayActions } from "@/hooks/features/MemoOverlay/useMemoOverlay";
import { PhaseTimeInput } from "./parts/PhaseTimeInput";
import { PhaseLabelSelection } from "./parts/PhaseLabelSelection";
import { PhaseMemoInput } from "./parts/PhaseMemoInput";
import { MatchMemoUnit } from "./parts/MatchMemoUnit";
import { getEventMetadata } from "@/lib/event-definitions";

const UI_VERSION = "0.1.6";

interface MemoOverlayViewProps {
  state: MemoOverlayState;
  actions: MemoOverlayActions;
  matchId: string | undefined;
  onClose: () => void;
  onSave: () => void;
}

/**
 * MemoOverlayView
 * 責務: MemoOverlayの全体レイアウトのオーケストレーター。
 * - ヘッダー、進捗バー、フッターナビゲーションを提供
 * - 現在のモード・フェーズに応じたコンテンツコンポーネントを切り替える
 * - 保存・閉じるなどのコール先は Props 経由で注入される
 */
export const MemoOverlayView: React.FC<MemoOverlayViewProps> = ({
  state,
  actions,
  matchId,
  onClose,
  onSave,
}) => {
  const { mode, phase, error, isSaving, formattedTime, selectedLabels } = state;

  // フェーズごとのコンテンツを返す
  const renderEventPhaseContent = () => {
    switch (phase) {
      case 0:
        return <PhaseTimeInput state={state} actions={actions} />;
      case 1:
        return <PhaseLabelSelection state={state} actions={actions} />;
      case 2:
        return <PhaseMemoInput state={state} actions={actions} onSave={onSave} />;
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed top-6 right-6 w-[22vw] min-w-[380px] aspect-[1/1.3] bg-slate-900 border border-slate-700/60 rounded-xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden font-sans animate-in slide-in-from-right-4 duration-500 flex flex-col"
      onKeyDown={(e) => e.stopPropagation()} // ページ側のイベントへの干渉を防止
    >
      {/* ── ヘッダー ── */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-slate-800/50 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              mode === "MATCH" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"
            }`}
          >
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-100 uppercase tracking-tighter">
              {mode === "MATCH" ? "Match Insight" : "Event"}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              {mode === "MATCH" ? "Final Summary" : `Phase ${phase + 1} of 3`}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-600 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── イベントモード: 進捗バー & レキャップ ── */}
      {mode === "EVENT" && (
        <>
          <div className="flex-shrink-0 flex h-1 bg-slate-800">
            <div
              className="bg-amber-500 transition-all duration-500"
              style={{ width: `${((phase + 1) / 4) * 100}%` }}
            />
          </div>
          {phase > 0 && (
            <div className="flex-shrink-0 px-5 py-2.5 bg-slate-950/20 border-b border-slate-800/50 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Time
                  </span>
                  <span className="text-[14px] font-mono text-amber-500 font-black">
                    {formattedTime.display}
                  </span>
                </div>
              </div>
              
              {phase >= 1 && selectedLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {selectedLabels.map((lbl, i) => {
                    const meta = getEventMetadata(lbl);
                    return (
                      <span 
                        key={i} 
                        className="text-[10px] px-2 py-0.5 rounded-full text-slate-100 font-bold border border-white/10 shadow-sm flex items-center gap-1"
                        style={{ backgroundColor: meta?.groupColor ?? "#334155" }}
                      >
                        {lbl}
                        <button
                          onClick={() => actions.removeLabel(i)}
                          className="opacity-60 hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
        {mode === "MATCH" ? (
          <MatchMemoUnit
            state={state}
            actions={actions}
            onSave={onSave}
            hasMatchId={!!matchId}
          />
        ) : (
          renderEventPhaseContent()
        )}
      </div>

      {/* ── イベントモード: フッターナビゲーション ── */}
      {mode === "EVENT" && (
        <div className="flex-shrink-0 px-5 py-4 bg-slate-950/30 border-t border-slate-800/50 flex justify-between items-center">
          <div className="flex gap-3">
            {phase > 0 && (
              <button
                onClick={actions.prevPhase}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-slate-100 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> BACK
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {phase < 2 ? (
              <button
                onClick={() => {
                  const result = actions.nextPhase();
                  if (result === "BLOCKED") return;
                }}
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
          <Info className="w-3 h-3 text-slate-400" />
          <span className="text-[9px] text-slate-300 font-bold uppercase truncate">
            Target: {matchId || "No Instance Connected"}
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
          <p className="text-xs text-red-200 font-bold leading-tight">{error}</p>
          <button onClick={actions.clearError} className="ml-auto text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
