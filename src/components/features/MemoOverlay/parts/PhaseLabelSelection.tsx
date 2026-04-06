"use client";

import React, { useRef, useEffect } from "react";
import { Tag, AlertCircle } from "lucide-react";
import { getEventMetadata } from "@/lib/event-definitions";
import type { MemoOverlayState, MemoOverlayActions } from "@/hooks/features/MemoOverlay/useMemoOverlay";

interface PhaseLabelSelectionProps {
  state: MemoOverlayState;
  actions: MemoOverlayActions;
}

/**
 * PhaseLabelSelection
 * 責務: ラベル選択フェーズ（Phase 1）のUI。
 * テキスト検索・サジェストリスト・選択済みラベルの表示と操作を担う。
 */
export const PhaseLabelSelection: React.FC<PhaseLabelSelectionProps> = ({ state, actions }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsContainerRef = useRef<HTMLDivElement>(null);

  // フェーズ表示時にフォーカス
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  // サジェストのスクロール追従
  useEffect(() => {
    if (state.isListMode && suggestionsContainerRef.current) {
      const container = suggestionsContainerRef.current;
      const activeItem = container.children[state.suggestionIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [state.suggestionIndex, state.isListMode]);

  return (
    <div className="p-4 flex flex-col gap-4">

      {/* 選択済みラベル一覧 */}

      {/* テキスト入力 */}
      <input
        ref={inputRef}
        type="text"
        value={state.labelInput}
        onChange={(e) => actions.setLabelInput(e.target.value)}
        placeholder="Type or select a label..."
        className={`w-full bg-transparent border-b pb-2 outline-none text-slate-100 placeholder:text-slate-600 text-lg font-bold transition-colors ${
          state.isInvalidLabel
            ? "border-red-500/50"
            : "border-slate-700 focus:border-blue-500"
        }`}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
      />

      {/* バリデーションエラー */}
      {state.validationError && state.phase === 1 && (
        <div className="text-[10px] text-red-500 font-bold flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-3 h-3" /> {state.validationError}
        </div>
      )}

      {/* サジェストリスト */}
      <div
        ref={suggestionsContainerRef}
        className="flex-1 flex flex-col gap-1 max-h-[160px] overflow-y-auto custom-scrollbar pr-1"
      >
        {state.suggestions.map((s, i) => (
          <div
            key={i}
            className={`px-3 py-1.5 rounded text-xs flex justify-between items-center cursor-pointer transition-all ${
              state.isListMode && i === state.suggestionIndex
                ? "bg-slate-800 text-white font-bold ring-1 ring-slate-600"
                : "text-slate-400 hover:bg-slate-800/30"
            }`}
            onClick={() => {
              actions.addLabel(s.label);
              inputRef.current?.focus();
            }}
          >
            <span>{s.label}</span>
            <span
              className="text-[10px] h-4 px-2 flex items-center justify-center rounded-sm bg-slate-950 font-black shadow-inner"
              style={{ color: s.groupColor, border: `1px solid ${s.groupColor}60` }}
            >
              {s.groupName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
