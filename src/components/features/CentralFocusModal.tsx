"use client";

import React, { useEffect, useRef } from "react";
import { EVENT_GROUPS } from "@/lib/event-definitions";
import { useKeyboardShortcut, useModalToggleShortcut } from "@/hooks/use-shortcut";
import { SHORTCUT_ACTIONS, isActionMatch } from "@/lib/shortcuts";
import type { AsyncDuckDBConnection, AsyncDuckDB } from "@duckdb/duckdb-wasm";

import { useUIStore } from "@/hooks/use-ui-store";
import { useCentralFocus } from "@/hooks/use-central-focus";
import { PhaseIndicator } from "./CentralFocus/PhaseIndicator";
import { TimestampPhase } from "./CentralFocus/TimestampPhase";
import { LabelPhase } from "./CentralFocus/LabelPhase";
import { MemoPhase } from "./CentralFocus/MemoPhase";

interface CentralFocusModalProps {
  matchId: string;
  db: AsyncDuckDB | null;
  connection: AsyncDuckDBConnection | null;
  onRefresh: (eventId: string) => void;
  editingEvent?: any;
  onClose?: () => void;
}

export function CentralFocusModal({ 
  matchId, db, connection, onRefresh, editingEvent, onClose 
}: CentralFocusModalProps) {
  const { isCentralFocusOpen, setCentralFocusOpen } = useUIStore();
  
  const logic = useCentralFocus({
    matchId, db, connection, onRefresh, editingEvent, 
    isOpen: isCentralFocusOpen, 
    setIsOpen: setCentralFocusOpen
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Modal Toggle (Global & Esc)
  useModalToggleShortcut(SHORTCUT_ACTIONS.OPEN_QUICK_EVENT, setCentralFocusOpen, { isOpen: isCentralFocusOpen });

  // Group Selection (Internal, Ctrl + 1~6)
  useKeyboardShortcut(
    (e: KeyboardEvent) => {
      const group = EVENT_GROUPS.find(g => isActionMatch(e, { key: g.shortcutKey, ctrl: true }));
      if (group && isCentralFocusOpen && logic.phase === "label") {
        logic.setActiveGroupId(prev => prev === group.id ? null : group.id);
        logic.setSuggestionIndex(0);
        return true; // Match found
      }
      return false;
    },
    () => {}, 
    { enabled: isCentralFocusOpen && logic.phase === "label", ignoreInput: false }
  );

  // Focus Management
  useEffect(() => {
    if (isCentralFocusOpen) {
      if (logic.phase === "timestamp" || logic.phase === "label") {
        inputRef.current?.focus();
      } else if (logic.phase === "memo") {
        textareaRef.current?.focus();
      }
    } else {
      logic.resetForm();
      onClose?.();
    }
  }, [isCentralFocusOpen, logic.phase]);

  // Editing Event Injection
  useEffect(() => {
    if (editingEvent) {
      setCentralFocusOpen(true);
      logic.setTimeStr(`${String(editingEvent.minute).padStart(2, "0")}${String(editingEvent.second).padStart(2, "0")}`);
      logic.setSelectedLabels(editingEvent.labels ?? []);
      logic.setLabelInput("");
      logic.setMemoStr(editingEvent.memo);
      logic.setPhase("memo");
    }
  }, [editingEvent]);

  useKeyboardShortcut(
    SHORTCUT_ACTIONS.SAVE_MEMO, 
    logic.handleSave, 
    { enabled: isCentralFocusOpen && logic.phase === "memo", ignoreInput: false }
  );

  if (!isCentralFocusOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md">
      <div className="w-[640px] bg-slate-900/90 border border-slate-700/80 shadow-2xl rounded-2xl overflow-hidden flex flex-col">
        
        <PhaseIndicator 
          phase={logic.phase} 
          setPhase={logic.setPhase} 
          formattedTime={logic.formattedTime} 
          selectedLabels={logic.selectedLabels} 
        />

        <div className="p-6">
          {logic.phase === "timestamp" && (
            <TimestampPhase 
              timeStr={logic.timeStr} 
              setTimeStr={logic.setTimeStr} 
              formattedTime={logic.formattedTime} 
              onNext={() => logic.setPhase("label")} 
              inputRef={inputRef}
            />
          )}

          {logic.phase === "label" && (
            <LabelPhase 
              labelInput={logic.labelInput} 
              setLabelInput={logic.setLabelInput} 
              selectedLabels={logic.selectedLabels} 
              setSelectedLabels={logic.setSelectedLabels} 
              suggestions={logic.suggestions} 
              suggestionIndex={logic.suggestionIndex} 
              setSuggestionIndex={logic.setSuggestionIndex} 
              activeGroupId={logic.activeGroupId} 
              setActiveGroupId={logic.setActiveGroupId} 
              onCommit={logic.commitLabel} 
              onPrev={() => logic.setPhase("timestamp")} 
              onNext={() => logic.setPhase("memo")} 
              inputRef={inputRef}
            />
          )}

          {logic.phase === "memo" && (
            <MemoPhase 
              memoStr={logic.memoStr} 
              setMemoStr={logic.setMemoStr} 
              onPrev={() => logic.setPhase("label")} 
              onSave={logic.handleSave} 
              textareaRef={textareaRef}
            />
          )}
        </div>
      </div>
    </div>
  );
}
