"use client";

import React, { KeyboardEvent, RefObject, useEffect, useRef } from "react";
import { EVENT_GROUPS, getEventMetadata } from "@/lib/event-definitions";

interface LabelPhaseProps {
  labelInput: string;
  setLabelInput: (val: string) => void;
  selectedLabels: string[];
  setSelectedLabels: (val: string[] | ((prev: string[]) => string[])) => void;
  suggestions: any[];
  suggestionIndex: number;
  setSuggestionIndex: (val: number | ((prev: number) => number)) => void;
  activeGroupId: string | null;
  setActiveGroupId: (val: string | null | ((prev: string | null) => string | null)) => void;
  onCommit: (label: string) => void;
  onPrev: () => void;
  onNext: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

export const LabelPhase: React.FC<LabelPhaseProps> = ({
  labelInput, setLabelInput,
  selectedLabels, setSelectedLabels,
  suggestions,
  suggestionIndex, setSuggestionIndex,
  activeGroupId, setActiveGroupId,
  onCommit, onPrev, onNext,
  inputRef,
}) => {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, suggestions.length);
  }, [suggestions]);

  useEffect(() => {
    if (itemRefs.current[suggestionIndex]) {
      itemRefs.current[suggestionIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [suggestionIndex]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestionIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggestionIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Backspace" && labelInput === "" && selectedLabels.length > 0) {
      e.preventDefault();
      setSelectedLabels(prev => prev.slice(0, -1));
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      onPrev();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const currentSelection = suggestions[suggestionIndex];
      const nextLabel = currentSelection ? currentSelection.label : labelInput;
      if (nextLabel) onCommit(nextLabel);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedLabels.length > 0) onNext();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* List of selected labels */}
      {selectedLabels.length > 0 && (
        <div className="flex gap-1.5 flex-wrap pb-2 border-b border-slate-700/60">
          {selectedLabels.map((lbl, i) => {
            const meta = getEventMetadata(lbl);
            return (
              <button
                key={i}
                className="text-sm px-2.5 py-1 rounded-full text-white font-medium cursor-pointer transition-opacity hover:opacity-75 flex items-center gap-1"
                style={{ backgroundColor: meta?.groupColor ?? "#8E8E93" }}
                onClick={() => setSelectedLabels(prev => prev.filter((_, idx) => idx !== i))}
                title="Click to remove"
              >
                {lbl}
                <span className="opacity-60 text-xs">×</span>
              </button>
            );
          })}
          <span className="text-slate-600 text-xs self-center ml-1">
            [Space] で追加 / [Enter] でメモへ
          </span>
        </div>
      )}

      {/* Input Field */}
      <input
        ref={inputRef}
        type="text"
        value={labelInput}
        onChange={e => {
          setLabelInput(e.target.value);
          setSuggestionIndex(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder={selectedLabels.length > 0 ? "続けて入力… (Enterでメモへ)" : "Type or select a label"}
        className="w-full text-xl font-semibold bg-transparent outline-none text-slate-200 placeholder:text-slate-600 border-b border-slate-700 pb-2"
      />

      {/* Group Filters */}
      <div className="flex gap-1.5 text-xs flex-wrap">
        {EVENT_GROUPS.map(g => (
          <div
            key={g.id}
            onClick={() => {
              setActiveGroupId(prev => prev === g.id ? null : g.id);
              setSuggestionIndex(0);
            }}
            className="cursor-pointer px-2 py-1 flex items-center gap-1 rounded border transition-colors"
            style={{
              backgroundColor: activeGroupId === g.id ? g.color : `${g.color}33`,
              borderColor: activeGroupId === g.id ? g.color : "transparent",
              color: activeGroupId === g.id ? "#fff" : "#94a3b8",
            }}
          >
            <span className="opacity-50 font-mono">^{g.shortcutKey}</span>
            <span>{g.name}</span>
          </div>
        ))}
      </div>

      {/* Suggestion List */}
      <div className="flex flex-col gap-0.5 max-h-[280px] overflow-y-auto pr-1">
        {(() => {
          let currentSub = "";
          const items: React.ReactNode[] = [];

          suggestions.forEach((item, idx) => {
            if (activeGroupId && !labelInput && currentSub !== item.subGroupName) {
              items.push(
                <div key={`header-${item.subGroupName}`} className="text-[11px] font-bold text-slate-500 mt-3 mb-1 px-3 uppercase tracking-wider">
                  {item.subGroupName}
                </div>
              );
              currentSub = item.subGroupName;
            }

            const isAlreadySelected = selectedLabels.includes(item.label);
            items.push(
              <div
                key={`${item.label}-${idx}`}
                ref={el => { itemRefs.current[idx] = el; }}
                className={`px-3 py-1.5 rounded flex items-center justify-between cursor-pointer transition-all ${isAlreadySelected ? "opacity-40" : ""} ${idx === suggestionIndex ? "text-white font-bold" : "text-slate-300 hover:opacity-90"}`}
                style={{
                  backgroundColor: idx === suggestionIndex ? item.groupColor : `${item.groupColor}15`,
                  border: idx === suggestionIndex ? `1px solid ${item.groupColor}` : "1px solid transparent",
                }}
                onClick={() => onCommit(item.label)}
              >
                <span>{item.label}</span>
                <span className="text-[10px] opacity-60 px-1.5 py-0.5 rounded-full bg-slate-950/40 whitespace-nowrap">
                  {item.groupName} / {item.subGroupName}
                </span>
              </div>
            );
          });
          return items;
        })()}
      </div>

      {/* Hint footer */}
      <div className="text-[11px] text-slate-600 text-center mt-1">
        [Space] で次の入力準備 &nbsp;·&nbsp; [Tab] でラベル確定 &nbsp;·&nbsp; [Enter] でメモへ &nbsp;·&nbsp; [Backspace] で直前を削除
      </div>
    </div>
  );
};
