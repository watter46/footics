import type Konva from 'konva';
import { useEffect, useState } from 'react';
import type { ShapeData, TacticalDrawTool } from '../types';

interface UseDrawingHotkeysProps {
  shapes: ShapeData[];
  setShapes: React.Dispatch<React.SetStateAction<ShapeData[]>>;
  selectedId: string | null;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedNodeRef: React.MutableRefObject<Konva.Node | null>;
  history: ShapeData[][];
  historyStep: number;
  undo: () => boolean;
  redo: () => boolean;
  activeTool: TacticalDrawTool;
  onSelectToolRequested?: (tool: TacticalDrawTool) => void;
}

export function useDrawingHotkeys({
  shapes,
  setShapes,
  selectedId,
  setSelectedId,
  selectedNodeRef,
  undo,
  redo,
  activeTool,
  onSelectToolRequested,
}: UseDrawingHotkeysProps) {
  const [copiedShape, setCopiedShape] = useState<ShapeData | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Undo: Cmd+Z (without Shift)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (undo()) setSelectedId(null);
        return;
      }

      // Redo: Cmd+Shift+Z or Cmd+Y
      if (
        (isCmdOrCtrl && e.key.toLowerCase() === 'z' && e.shiftKey) ||
        (isCmdOrCtrl && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        if (redo()) setSelectedId(null);
        return;
      }

      // Copy: Cmd+C
      if (isCmdOrCtrl && e.key.toLowerCase() === 'c') {
        if (selectedId) {
          const shapeToCopy = shapes.find((s) => s.id === selectedId);
          if (shapeToCopy) {
            setCopiedShape(shapeToCopy);
          }
        }
        return;
      }

      // Paste: Cmd+V
      if (isCmdOrCtrl && e.key.toLowerCase() === 'v') {
        if (copiedShape) {
          e.preventDefault();
          const newId = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const offset = 20;

          const pasted: ShapeData = {
            ...copiedShape,
            id: newId,
          };

          if (pasted.type === 'arrow' && pasted.points) {
            pasted.points = [
              pasted.points[0] + offset,
              pasted.points[1] + offset,
              pasted.points[2] + offset,
              pasted.points[3] + offset,
            ];
            if (pasted.controlPoint) {
              pasted.controlPoint = {
                x: pasted.controlPoint.x + offset,
                y: pasted.controlPoint.y + offset,
              };
            }
          } else if (
            pasted.type === 'zone' &&
            pasted.x !== undefined &&
            pasted.y !== undefined
          ) {
            pasted.x += offset;
            pasted.y += offset;
          }

          setShapes((prev) => [...prev, pasted]);
          setSelectedId(newId);
        }
        return;
      }

      // Clear All: Cmd+Shift+K
      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShapes([]);
        setSelectedId(null);
        return;
      }

      // Tool Switching (Single Key without Cmd/Ctrl)
      if (!isCmdOrCtrl && onSelectToolRequested) {
        if (e.key === 'v' || e.key === 'V' || e.key === '1') {
          onSelectToolRequested('select');
        } else if (e.key === 'a' || e.key === 'A' || e.key === '2') {
          onSelectToolRequested('arrow_solid');
        } else if (e.key === 'd' || e.key === 'D' || e.key === '3') {
          onSelectToolRequested('arrow_dash');
        } else if (e.key === 'z' || e.key === 'Z' || e.key === '4') {
          onSelectToolRequested('zone_circle');
        } else if (e.key === 'e' || e.key === 'E' || e.key === '5') {
          onSelectToolRequested('eraser');
        }
      }

      // Delete Selected Shape
      if (!isCmdOrCtrl && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (selectedId) {
          e.preventDefault();
          setShapes((prev) => prev.filter((s) => s.id !== selectedId));
          setSelectedId(null);
          selectedNodeRef.current = null;
        }
      }

      // Escape key: deselect or switch to select tool
      if (!isCmdOrCtrl && e.key === 'Escape') {
        e.preventDefault();
        if (selectedId) {
          setSelectedId(null);
          selectedNodeRef.current = null;
        } else if (activeTool !== 'select' && onSelectToolRequested) {
          onSelectToolRequested('select');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedId,
    activeTool,
    onSelectToolRequested,
    shapes,
    copiedShape,
    undo,
    redo,
    setShapes,
    setSelectedId,
    selectedNodeRef,
  ]);
}
