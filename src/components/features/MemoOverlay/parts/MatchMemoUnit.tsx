"use client";

import React, { useRef, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
interface MatchMemoUnitProps {
  memo: string;
  isSaving: boolean;
  hasMatchId: boolean;
  onMemoChange: (val: string) => void;
  onSave: () => void;
}

/**
 * MatchMemoUnit
 * 責務: 試合総括モード（MATCH）のUI。
 * シングルフェーズのメモ入力と保存ボタンを担う。
 */
export const MatchMemoUnit: React.FC<MatchMemoUnitProps> = ({
  memo,
  isSaving,
  hasMatchId,
  onMemoChange,
  onSave,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // マウント時にフォーカス
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="p-4 flex flex-col gap-3 custom-scrollbar">
      <textarea
        ref={textareaRef}
        value={memo}
        onChange={(e) => onMemoChange(e.target.value)}
        placeholder="試合全体の総括を記録..."
        className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-all resize-none custom-scrollbar"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onSave();
          }
        }}
      />
      <div className="flex justify-between items-center">
        <div className="flex gap-3 text-[9px] text-slate-300 uppercase font-black">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded-sm">Esc</kbd>{" "}
            Close
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded-sm">
              Ctrl+Ent
            </kbd>{" "}
            Save
          </span>
        </div>
        <button
          onClick={onSave}
          disabled={isSaving || !hasMatchId}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Match Memo
        </button>
      </div>
    </div>
  );
};
