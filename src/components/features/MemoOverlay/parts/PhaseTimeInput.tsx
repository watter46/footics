"use client";

import React, { useRef, useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";
import type { MemoOverlayState, MemoOverlayActions } from "@/hooks/features/MemoOverlay/useMemoOverlay";

interface PhaseTimeInputProps {
  state: MemoOverlayState;
  actions: MemoOverlayActions;
}

/**
 * PhaseTimeInput
 * 責務: 時間入力フェーズ（Phase 0）のUI。
 * 数字入力・バリデーションフィードバック・パース結果の表示を担う。
 */
export const PhaseTimeInput: React.FC<PhaseTimeInputProps> = ({ state, actions }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // フェーズ表示時にフォーカス
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []); // マウント時のみ

  return (
    <div className="p-6 flex flex-col items-center gap-6">
      <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
        <Clock className="w-3 h-3" /> Step 1: Timestamp
      </div>
      <input
        ref={inputRef}
        type="text"
        value={state.timeStr}
        onChange={(e) => {
          const val = e.target.value;
          // 全角数字を半角に変換し、数字のみ最大5文字
          const normalized = val
            .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
            .replace(/\D/g, "")
            .slice(0, 5);
          actions.setTimeStr(normalized);
        }}
        placeholder="MMSS"
        className="w-full text-center text-6xl font-mono bg-transparent outline-none text-slate-200 placeholder:text-slate-800 tracking-widest"
        onKeyDown={(e) => {
          // Action Bridgeに制御を委譲するため、Enterのデフォルト動作のみ阻止
          if (e.key === "Enter" || e.key === "Tab") e.preventDefault();
        }}
      />
      <div
        className={`text-sm font-mono h-6 transition-colors ${
          state.validationError && state.phase === 0
            ? "text-red-500 font-bold animate-pulse"
            : "text-slate-300"
        }`}
      >
        {state.validationError && state.phase === 0 ? (
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {state.validationError}
          </span>
        ) : state.formattedTime.empty ? (
          "Enter numbers (e.g. 12345)"
        ) : (
          `Parsed: ${state.formattedTime.display}`
        )}
      </div>
    </div>
  );
};
