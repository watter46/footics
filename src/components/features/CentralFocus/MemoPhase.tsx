"use client";

import React, { KeyboardEvent, RefObject } from "react";

interface MemoPhaseProps {
  memoStr: string;
  setMemoStr: (val: string) => void;
  onPrev: () => void;
  onSave: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export const MemoPhase: React.FC<MemoPhaseProps> = ({
  memoStr,
  setMemoStr,
  onPrev,
  onSave,
  textareaRef,
}) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      onPrev();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <textarea
        ref={textareaRef}
        value={memoStr}
        onChange={e => setMemoStr(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Start typing your tactical analysis... (Ctrl+Enter to save)"
        className="w-full h-40 resize-none bg-transparent outline-none text-slate-200 placeholder:text-slate-600 text-lg leading-relaxed"
        spellCheck={false}
      />
      <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-800 pt-4">
        <span>[Esc] Cancel &nbsp;·&nbsp; [Shift+Tab] ← Label</span>
        <span className="text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Ctrl + Enter to Save</span>
      </div>
    </div>
  );
};
