'use client';

import { useCallback, useRef } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';

interface UseCanvasQuickToolsOptions {
  activeSlideId: string;
  setEditingTextId: (id: string | null) => void;
}

export function useCanvasQuickTools({
  activeSlideId,
  setEditingTextId,
}: UseCanvasQuickToolsOptions) {
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const continuousDrawing = useTacticalUnifiedStore((s) => s.continuousDrawing);
  const setActiveTool = useTacticalUnifiedStore((s) => s.setActiveTool);
  const addText = useTacticalUnifiedStore((s) => s.addText);
  const addPlayerFromPalette = useTacticalUnifiedStore(
    (s) => s.addPlayerFromPalette,
  );
  const eraseAtPoint = useTacticalUnifiedStore((s) => s.eraseAtPoint);
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);

  const isErasingRef = useRef(false);

  const handlePointerDown = useCallback(
    (normPos: { x: number; y: number }): boolean => {
      if (activeTool === 'eraser') {
        isErasingRef.current = true;
        eraseAtPoint(activeSlideId, normPos, 4.0);
        return true;
      }

      if (activeTool === 'player-ring') {
        const id = addPlayerFromPalette('home', normPos.x, normPos.y, 'ring');
        selectObject({ id, kind: 'player' });
        if (!continuousDrawing) setActiveTool('select');
        return true;
      }

      if (activeTool === 'player') {
        const id = addPlayerFromPalette('home', normPos.x, normPos.y, 'circle');
        selectObject({ id, kind: 'player' });
        if (!continuousDrawing) setActiveTool('select');
        return true;
      }

      if (activeTool === 'text') {
        const newTextId = crypto.randomUUID();
        addText(activeSlideId, {
          id: newTextId,
          annotationType: 'text',
          x: normPos.x,
          y: normPos.y,
          content: '',
          fontSize: 16,
          color: '#ffffff',
          bold: false,
          italic: false,
        });
        selectObject({ id: newTextId, kind: 'text' });
        setEditingTextId(newTextId);
        setActiveTool('select');
        return true;
      }

      return false;
    },
    [
      activeTool,
      activeSlideId,
      eraseAtPoint,
      addPlayerFromPalette,
      selectObject,
      continuousDrawing,
      setActiveTool,
      addText,
      setEditingTextId,
    ],
  );

  const handlePointerMove = useCallback(
    (normPos: { x: number; y: number }): boolean => {
      if (activeTool === 'eraser' && isErasingRef.current) {
        eraseAtPoint(activeSlideId, normPos, 4.0);
        return true;
      }
      return false;
    },
    [activeTool, activeSlideId, eraseAtPoint],
  );

  const handlePointerUp = useCallback((): boolean => {
    if (isErasingRef.current) {
      isErasingRef.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    isErasingRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
