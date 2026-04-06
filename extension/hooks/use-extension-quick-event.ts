import { useState, useMemo, useCallback, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { getFlattenedEvents } from '@/lib/event-definitions';

export type Phase = "timestamp" | "label" | "memo";

interface UseExtensionQuickEventProps {
  matchId: string | null;
  onSaveSuccess?: () => void;
}

export function useExtensionQuickEvent({ matchId, onSaveSuccess }: UseExtensionQuickEventProps) {
  const [phase, setPhase] = useState<Phase>("timestamp");
  const [timeStr, setTimeStr] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [memoStr, setMemoStr] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const flatEvents = useMemo(() => getFlattenedEvents(), []);

  // 時間のパース処理 (本体のロジックと同一)
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

  // サジェスト処理
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

  // イベントオブジェクトの生成
  const prepareEvent = useCallback(() => {
    if (!matchId || minute < 0 || selectedLabels.length === 0) return null;
    return {
      id: crypto.randomUUID(),
      match_id: matchId,
      minute,
      second,
      labels: selectedLabels,
      memo: memoStr.trim(),
      created_at: Date.now(),
    };
  }, [matchId, minute, second, selectedLabels, memoStr]);

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

  // 保存処理 (Content Script 経由 - UIボタン用)
  const handleSave = useCallback(async () => {
    const event = prepareEvent();
    if (!event) {
      console.warn('Save failed: validation error');
      return;
    }

    setIsSaving(true);
    try {
      const tabs = await browser.tabs.query({});
      const footicsTab = tabs.find(t => 
        t.url?.includes('localhost:3000') || 
        t.url?.includes('10.255.255.254') || 
        t.url?.includes('footics.com')
      );

      if (footicsTab?.id) {
        const response = await browser.tabs.sendMessage(footicsTab.id, { 
          type: 'SAVE_CUSTOM_EVENT', 
          event 
        });
        
        if (response?.success) {
          onSaveSuccess?.();
          resetForm();
        }
      }
    } catch (e) {
      console.error('Failed to save event via extension:', e);
    } finally {
      setIsSaving(false);
    }
  }, [prepareEvent, onSaveSuccess, resetForm]);

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
    prepareEvent,
    commitLabel,
    resetForm,
    isSaving
  };
}
