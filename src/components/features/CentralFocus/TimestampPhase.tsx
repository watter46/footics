"use client";

import React, { KeyboardEvent, RefObject } from "react";

interface TimestampPhaseProps {
  timeStr: string;
  setTimeStr: (val: string) => void;
  formattedTime: string;
  onNext: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

export const TimestampPhase: React.FC<TimestampPhaseProps> = ({
  timeStr,
  setTimeStr,
  formattedTime,
  onNext,
  inputRef,
}) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
    } else if (e.key === "Tab" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (formattedTime) onNext();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        ref={inputRef}
        type="text"
        value={timeStr}
        onChange={e => setTimeStr(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="MMSS (e.g. 325 → 03:25)"
        className="w-full text-center text-5xl font-mono bg-transparent outline-none text-slate-200 placeholder:text-slate-700 tracking-widest"
        autoFocus
      />
      <div className="text-slate-500 text-sm h-6">
        {formattedTime ? `Parsed: ${formattedTime}` : "Enter numbers and press Space/Tab/Enter"}
      </div>
    </div>
  );
};
