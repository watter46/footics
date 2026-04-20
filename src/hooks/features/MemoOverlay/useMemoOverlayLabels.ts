import { useCallback, useMemo, useState } from 'react';
import {
  type FlattenedEvent,
  getFlattenedEvents,
} from '@/lib/event-definitions';

export function useMemoOverlayLabels() {
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isListMode, setIsListMode] = useState(false);

  const flattenedEvents = useMemo(() => getFlattenedEvents(), []);

  const suggestions = useMemo<FlattenedEvent[]>(() => {
    if (!labelInput) return flattenedEvents.slice(0, 50);
    const query = labelInput.toLowerCase();
    return flattenedEvents
      .filter(
        (e) =>
          e.label.toLowerCase().includes(query) ||
          e.keywords.some((k) => k.toLowerCase().includes(query)),
      )
      .slice(0, 15);
  }, [labelInput, flattenedEvents]);

  const isInvalidLabel = useMemo(() => {
    if (!labelInput) return false;
    return !suggestions.some(
      (s) => s.label.toLowerCase() === labelInput.toLowerCase(),
    );
  }, [labelInput, suggestions]);

  const setLabelInputAction = useCallback((val: string) => {
    setLabelInput(val);
    setSuggestionIndex(0);
    setIsListMode(false);
  }, []);

  const addLabel = useCallback((label: string) => {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev : [...prev, label],
    );
    setLabelInput('');
    setSuggestionIndex(0);
    setIsListMode(false);
  }, []);

  const removeLabel = useCallback((index: number) => {
    setSelectedLabels((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const backspaceLabel = useCallback(() => {
    if (labelInput !== '') {
      setLabelInput((prev) => prev.slice(0, -1));
    } else if (selectedLabels.length > 0) {
      setSelectedLabels((prev) => {
        const labels = [...prev];
        const last = labels.pop();
        if (last) setLabelInput(last);
        return labels;
      });
      setIsListMode(false);
    }
  }, [labelInput, selectedLabels]);

  const navigateSuggestion = useCallback(
    (direction: 1 | -1) => {
      if (suggestions.length === 0) return;

      if (!isListMode && direction === 1) {
        setIsListMode(true);
        setSuggestionIndex(0);
        return;
      }

      setIsListMode(true);
      setSuggestionIndex((prev) => {
        const next = prev + direction;
        if (next < 0) return suggestions.length - 1;
        if (next >= suggestions.length) return 0;
        return next;
      });
    },
    [suggestions, isListMode],
  );

  const confirmSuggestion = useCallback(() => {
    const target = suggestions[suggestionIndex];
    if (target) {
      addLabel(target.label);
    }
  }, [suggestions, suggestionIndex, addLabel]);

  const resetLabels = useCallback(() => {
    setSelectedLabels([]);
    setLabelInput('');
    setSuggestionIndex(0);
    setIsListMode(false);
  }, []);

  return {
    selectedLabels,
    labelInput,
    suggestionIndex,
    isListMode,
    suggestions,
    isInvalidLabel,
    setLabelInput: setLabelInputAction,
    setSelectedLabels,
    setIsListMode,
    setSuggestionIndex,
    addLabel,
    removeLabel,
    backspaceLabel,
    navigateSuggestion,
    confirmSuggestion,
    resetLabels,
  };
}
