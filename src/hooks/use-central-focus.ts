import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { getFlattenedEvents, FlattenedEvent } from "@/lib/event-definitions";
import { saveCustomEvent } from "@/lib/db";
import { loadCustomEventsToDuckDB } from "@/lib/duckdb/data-loader";
import { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";

export type Phase = "timestamp" | "label" | "memo";

interface UseCentralFocusProps {
  matchId: string;
  db: AsyncDuckDB | null;
  connection: AsyncDuckDBConnection | null;
  onRefresh: (eventId: string) => void;
  editingEvent?: any;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function useCentralFocus({
  matchId, db, connection, onRefresh, editingEvent, isOpen, setIsOpen
}: UseCentralFocusProps) {
  const [phase, setPhase] = useState<Phase>("timestamp");
  const [timeStr, setTimeStr] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [memoStr, setMemoStr] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const flatEvents = useMemo(() => getFlattenedEvents(), []);

  // Parse time
  const { minute, second, formattedTime } = useMemo(() => {
    const raw = timeStr.trim();
    if (!raw) return { minute: -1, second: -1, formattedTime: "" };

    let m = 0;
    let s = 0;
    if (raw.length <= 2) {
      if (!isNaN(parseInt(raw, 10))) s = parseInt(raw, 10);
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

  // Suggestions
  const suggestions = useMemo(() => {
    let allOptions = flatEvents;
    if (activeGroupId) {
      allOptions = allOptions.filter(e => e.groupCode === activeGroupId);
    }
    const q = labelInput.trim().toLowerCase();
    if (q !== "") {
      allOptions = allOptions.filter(item => {
        if (item.label.toLowerCase().includes(q)) return true;
        return item.keywords.some(kw => kw.toLowerCase().includes(q));
      });
    }
    return allOptions;
  }, [labelInput, flatEvents, activeGroupId]);

  const handleSave = useCallback(async () => {
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

    // External bridge
    window.dispatchEvent(new CustomEvent('footics-action', { 
        detail: { type: 'event-save', matchId, eventId: id } 
    }));
  }, [minute, selectedLabels, memoStr, editingEvent, matchId, db, connection, setIsOpen, onRefresh]);

  const commitLabel = useCallback((label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (selectedLabels.includes(trimmed)) {
      setLabelInput("");
      setSuggestionIndex(0);
      return;
    }
    setSelectedLabels(prev => [...prev, trimmed]);
    setLabelInput("");
    setSuggestionIndex(0);
  }, [selectedLabels]);

  const resetForm = useCallback(() => {
    setPhase("timestamp");
    setTimeStr("");
    setSelectedLabels([]);
    setLabelInput("");
    setMemoStr("");
    setSuggestionIndex(0);
    setActiveGroupId(null);
  }, []);

  return {
    phase, setPhase,
    timeStr, setTimeStr,
    selectedLabels, setSelectedLabels,
    labelInput, setLabelInput,
    memoStr, setMemoStr,
    suggestionIndex, setSuggestionIndex,
    activeGroupId, setActiveGroupId,
    formattedTime, minute, second,
    suggestions,
    handleSave,
    commitLabel,
    resetForm
  };
}
