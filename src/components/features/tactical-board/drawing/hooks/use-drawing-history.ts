import { useCallback, useRef, useState } from 'react';
import type { ShapeData } from '../types';

export function useDrawingHistory() {
  const [shapes, setShapes] = useState<ShapeData[]>([]);
  const [history, setHistory] = useState<ShapeData[][]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);
  const isUndoRedoRef = useRef(false);

  const saveHistory = useCallback(
    (newShapes: ShapeData[]) => {
      if (isUndoRedoRef.current) {
        isUndoRedoRef.current = false;
        return;
      }
      setHistory((prev) => {
        const nextHistory = prev.slice(0, historyStep + 1);
        return [...nextHistory, newShapes];
      });
      setHistoryStep((prev) => prev + 1);
    },
    [historyStep],
  );

  const undo = useCallback(() => {
    if (historyStep > 0) {
      isUndoRedoRef.current = true;
      const prevStep = historyStep - 1;
      setShapes(history[prevStep] || []);
      setHistoryStep(prevStep);
      return true;
    }
    return false;
  }, [history, historyStep]);

  const redo = useCallback(() => {
    if (historyStep < history.length - 1) {
      isUndoRedoRef.current = true;
      const nextStep = historyStep + 1;
      setShapes(history[nextStep] || []);
      setHistoryStep(nextStep);
      return true;
    }
    return false;
  }, [history, historyStep]);

  const clearHistory = useCallback(() => {
    setShapes([]);
    setHistory([]);
    setHistoryStep(-1);
    isUndoRedoRef.current = false;
  }, []);

  return {
    shapes,
    setShapes,
    history,
    historyStep,
    saveHistory,
    undo,
    redo,
    clearHistory,
  };
}
