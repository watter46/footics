"use client";

import React, { useState, useMemo, KeyboardEvent, useEffect, useRef } from "react";
import { EVENT_GROUPS, getFlattenedEvents, getEventMetadata, FlattenedEvent } from "@/lib/event-definitions";
import { saveCustomEvent } from "@/lib/db";
import { loadCustomEventsToDuckDB } from "@/lib/duckdb/data-loader";
import type { AsyncDuckDBConnection, AsyncDuckDB } from "@duckdb/duckdb-wasm";
import { Badge } from "@/components/ui/badge";

interface CentralFocusModalProps {
  matchId: string;
  db: AsyncDuckDB | null;
  connection: AsyncDuckDBConnection | null;
  onRefresh: (eventId: string) => void;
  editingEvent?: { id: string; minute: number; second: number; labels: string[]; memo: string } | null;
  onClose?: () => void;
}

type Phase = "timestamp" | "label" | "memo";

export function CentralFocusModal({ matchId, db, connection, onRefresh, editingEvent, onClose }: CentralFocusModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("timestamp");

  const [timeStr, setTimeStr] = useState("");
  // 選択済みラベル（複数）
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  // ラベル入力フェーズの入力文字列
  const [labelInput, setLabelInput] = useState("");
  const [memoStr, setMemoStr] = useState("");

  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const flatEvents = useMemo(() => getFlattenedEvents(), []);

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Parse time
  const { minute, second, formattedTime } = useMemo(() => {
    const raw = timeStr.trim();
    if (!raw) return { minute: -1, second: -1, formattedTime: "" };

    let m = 0;
    let s = 0;
    if (raw.length <= 2) {
      if (!isNaN(parseInt(raw, 10))) {
        s = parseInt(raw, 10);
      }
    } else {
      s = parseInt(raw.slice(-2), 10);
      m = parseInt(raw.slice(0, -2), 10);
    }
    if (isNaN(m)) m = 0;
    if (isNaN(s)) s = 0;
    if (s > 59) s = 59;

    const formatted = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return { minute: m, second: s, formattedTime: formatted };
  }, [timeStr]);

  // Handle Ctrl+I and group shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "i") {
          e.preventDefault();
          setIsOpen(true);
        } else if (isOpen && phase === "label") {
          const group = EVENT_GROUPS.find(g => g.shortcutKey === e.key);
          if (group) {
            e.preventDefault();
            setActiveGroupId(prev => prev === group.id ? null : group.id);
            setSuggestionIndex(0);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, phase]);

  // Set focus on open or phase change
  useEffect(() => {
    if (isOpen) {
      if (phase === "timestamp" || phase === "label") {
        inputRef.current?.focus();
      } else if (phase === "memo") {
        textareaRef.current?.focus();
      }
    } else {
      setPhase("timestamp");
      setTimeStr("");
      setSelectedLabels([]);
      setLabelInput("");
      setMemoStr("");
      setSuggestionIndex(0);
      setActiveGroupId(null);
      onClose?.();
    }
  }, [isOpen, phase]);

  // Handle editing event injection
  useEffect(() => {
    if (editingEvent) {
      setIsOpen(true);
      setTimeStr(`${String(editingEvent.minute).padStart(2, "0")}${String(editingEvent.second).padStart(2, "0")}`);
      setSelectedLabels(editingEvent.labels ?? []);
      setLabelInput("");
      setMemoStr(editingEvent.memo);
      setPhase("memo");
    }
  }, [editingEvent]);

  // Suggestions based on labelInput and activeGroupId
  const suggestions = useMemo(() => {
    let allOptions = flatEvents;
    if (activeGroupId) {
      allOptions = allOptions.filter(e => e.groupCode === activeGroupId);
    }
    // スペースを含む入力（"アシスト "など）も正しくマッチするようトリム
    const q = labelInput.trim().toLowerCase();
    if (q !== "") {
      allOptions = allOptions.filter(item => {
        if (item.label.toLowerCase().includes(q)) return true;
        return item.keywords.some(kw => kw.toLowerCase().includes(q));
      });
    }
    return allOptions;
  }, [labelInput, isOpen, flatEvents, activeGroupId]);


  // Scroll into view when index changes
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, suggestions.length);
  }, [suggestions]);

  useEffect(() => {
    if (phase === "label" && itemRefs.current[suggestionIndex]) {
      itemRefs.current[suggestionIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [suggestionIndex, phase]);

  const handleSave = async () => {
    if (minute < 0 || selectedLabels.length === 0) return;

    const id = editingEvent ? editingEvent.id : crypto.randomUUID();
    const event = {
      id,
      match_id: matchId,
      minute,
      second,
      labels: selectedLabels,
      memo: memoStr.trim(),
      created_at: Date.now(),
    };

    await saveCustomEvent(event as any);

    if (db && connection) {
      await loadCustomEventsToDuckDB(db, connection, matchId);
    }

    setIsOpen(false);
    onRefresh(id);
  };

  // ラベルを選択済みに追加し、入力をリセット（ラベル入力フェーズを継続）
  const commitLabel = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    // 重複ラベルは追加しない
    if (selectedLabels.includes(trimmed)) {
      setLabelInput("");
      setSuggestionIndex(0);
      inputRef.current?.focus();
      return;
    }
    setSelectedLabels(prev => [...prev, trimmed]);
    setLabelInput("");
    setSuggestionIndex(0);
    inputRef.current?.focus();
  };

  // 最後のラベルを削除
  const removeLastLabel = () => {
    setSelectedLabels(prev => prev.slice(0, -1));
  };

  const handleTimestampKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
    } else if (e.key === "Tab" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (formattedTime) setPhase("label");
    }
  };

  const handleLabelKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestionIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggestionIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Backspace" && labelInput === "" && selectedLabels.length > 0) {
      // 入力が空の状態でBackspaceを押したら最後のラベルを削除
      e.preventDefault();
      removeLastLabel();
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      setPhase("timestamp");
    } else if (e.key === "Tab") {
      // Tab のみでラベルを確定（重複はcommitLabel内で防止）
      e.preventDefault();
      const currentSelection = suggestions[suggestionIndex];
      // サジェストが選択されている場合はそのラベル、なければ入力値で確定
      const nextLabel = currentSelection ? currentSelection.label : labelInput;
      if (nextLabel) commitLabel(nextLabel);
    } else if (e.key === "Enter") {
      // Enter → ハイライト中のアイテムを選択せず、メモフェーズへ進むだけ
      e.preventDefault();
      if (selectedLabels.length > 0) {
        setPhase("memo");
      }
      // selectedLabels が空の場合は何もしない（ラベルを1つ以上選ばせる）
    }
    // Space は通常の文字入力として動作（追加の準備 = 入力に空白を加えるだけ）
  };

  const handleMemoKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      setPhase("label");
    } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md">
      <div className="w-[640px] bg-slate-900/90 border border-slate-700/80 shadow-2xl rounded-2xl overflow-hidden flex flex-col">
        {/* Header Phase indicator */}
        <div className="flex bg-slate-950/50 p-4 border-b border-slate-800/80 items-center justify-center gap-4">
          {phase === "memo" ? (
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Badge
                className="bg-amber-500/20 text-amber-500 text-lg py-1 px-3 border border-amber-500/30 cursor-pointer hover:bg-amber-500/30 transition-colors"
                onClick={() => setPhase("timestamp")}
                title="Click to edit time"
              >
                {formattedTime}
              </Badge>
              <div className="flex gap-1 flex-wrap">
                {selectedLabels.map((lbl, i) => {
                  const meta = getEventMetadata(lbl);
                  return (
                    <Badge
                      key={i}
                      className="text-base py-1 px-3 cursor-pointer transition-colors border text-white"
                      style={{ backgroundColor: meta?.groupColor ?? "#8E8E93", borderColor: meta?.groupColor ?? "#8E8E93" }}
                      onClick={() => setPhase("label")}
                      title="Click to edit labels"
                    >
                      {lbl}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-sm font-medium text-slate-400 tracking-wider w-full text-center relative flex justify-center gap-4">
              <span
                className={`cursor-pointer transition-colors ${phase === "timestamp" ? "text-amber-400 font-bold" : "hover:text-amber-200"}`}
                onClick={() => setPhase("timestamp")}
              >
                1. TIME
              </span>
              <span className="text-slate-600">/</span>
              <span
                className={`cursor-pointer transition-colors ${phase === "label" ? "text-amber-400 font-bold" : "hover:text-amber-200"}`}
                onClick={() => setPhase("label")}
              >
                2. LABEL
              </span>
              <span className="text-slate-600">/</span>
              <span
                className="cursor-pointer transition-colors hover:text-amber-200"
                onClick={() => setPhase("memo")}
              >
                3. MEMO
              </span>
            </div>
          )}
        </div>

        {/* Dynamic Content */}
        <div className="p-6">
          {phase === "timestamp" && (
            <div className="flex flex-col items-center gap-4">
              <input
                ref={inputRef}
                type="text"
                value={timeStr}
                onChange={e => setTimeStr(e.target.value)}
                onKeyDown={handleTimestampKeyDown}
                placeholder="MMSS (e.g. 325 → 03:25)"
                className="w-full text-center text-5xl font-mono bg-transparent outline-none text-slate-200 placeholder:text-slate-700 tracking-widest"
                autoFocus
              />
              <div className="text-slate-500 text-sm h-6">
                {formattedTime ? `Parsed: ${formattedTime}` : "Enter numbers and press Space/Tab/Enter"}
              </div>
            </div>
          )}

          {phase === "label" && (
            <div className="flex flex-col gap-3">
              {/* 選択済みラベル一覧 */}
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

              {/* 入力フィールド */}
              <input
                ref={inputRef}
                type="text"
                value={labelInput}
                onChange={e => {
                  setLabelInput(e.target.value);
                  setSuggestionIndex(0);
                }}
                onKeyDown={handleLabelKeyDown}
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

                    // 既に選択済みのラベルは薄く表示
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
                        onClick={() => commitLabel(item.label)}
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
          )}

          {phase === "memo" && (
            <div className="flex flex-col gap-4">
              <textarea
                ref={textareaRef}
                value={memoStr}
                onChange={e => setMemoStr(e.target.value)}
                onKeyDown={handleMemoKeyDown}
                placeholder="Start typing your tactical analysis... (Ctrl+Enter to save)"
                className="w-full h-40 resize-none bg-transparent outline-none text-slate-200 placeholder:text-slate-600 text-lg leading-relaxed"
                spellCheck={false}
              />
              <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-800 pt-4">
                <span>[Esc] Cancel &nbsp;·&nbsp; [Shift+Tab] ← Label</span>
                <span className="text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Ctrl + Enter to Save</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
