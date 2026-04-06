"use client";

import React, { useRef, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import type { MemoOverlayState, MemoOverlayActions } from "@/hooks/features/MemoOverlay/useMemoOverlay";

interface PhaseMemoInputProps {
  state: MemoOverlayState;
  actions: MemoOverlayActions;
  onSave: () => void;
}

/**
 * PhaseMemoInput
 * 責務: 補足メモ入力フェーズ（Phase 2）のUI。
 * Ctrl+EnterでのSave連携、フォーカス管理を担う。
 */
export const PhaseMemoInput: React.FC<PhaseMemoInputProps> = ({ state, actions, onSave }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // フェーズ表示時にフォーカス
  useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
        <MessageSquare className="w-3 h-3" /> Step 3: Memo (Optional)
      </div>
      <textarea
        ref={textareaRef}
        value={state.memo}
        onChange={(e) => actions.setMemo(e.target.value)}
        placeholder="補足メモを入力..."
        className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 outline-none focus:border-blue-500 transition-all resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onSave();
          }
        }}
      />
    </div>
  );
};
