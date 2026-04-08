import { useEffect } from 'react';
import { useEditorStore, ToolType } from '../stores/useEditorStore';
import { Canvas } from 'fabric';

export const useShortcuts = (canvas: Canvas | null) => {
  const { setTool, selectedObjectId } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      // Undo / Redo
      if (e.ctrlKey || e.metaKey) {
        if (key === 'z') {
          if (e.shiftKey) {
            useEditorStore.getState().redo();
          } else {
            useEditorStore.getState().undo();
          }
          e.preventDefault();
        } else if (key === 'y') {
          useEditorStore.getState().redo();
          e.preventDefault();
        }
      }

      // Tool Switching
      const toolMap: Record<string, ToolType> = {
        'v': 'select',
        'r': 'rect',
        'o': 'circle',
        'a': 'arrow',
        'l': 'line',
        'h': 'highlight',
        's': 'spotlight',
        'c': 'connector',
      };

      if (toolMap[key]) {
        setTool(toolMap[key]);
      }

      // Deletion
      if (key === 'delete' || key === 'backspace') {
        if (canvas) {
          const activeObjects = canvas.getActiveObjects();
          if (activeObjects.length > 0) {
            activeObjects.forEach(obj => {
              const id = (obj as any).id;
              if (id) {
                useEditorStore.getState().removeObject(id);
              }
            });
            canvas.discardActiveObject();
            canvas.renderAll();
          }
        }
      }

      // Reordering
      if (selectedObjectId) {
        if (key === '[') {
          if (e.ctrlKey || e.metaKey) {
            useEditorStore.getState().sendBackward(selectedObjectId);
          } else {
            useEditorStore.getState().sendToBack(selectedObjectId);
          }
          e.preventDefault();
        } else if (key === ']') {
          if (e.ctrlKey || e.metaKey) {
            useEditorStore.getState().bringForward(selectedObjectId);
          } else {
            useEditorStore.getState().bringToFront(selectedObjectId);
          }
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas, setTool, selectedObjectId]);
};
