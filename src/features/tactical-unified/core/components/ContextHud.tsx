'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../hooks/use-canvas-store';
import {
  ArrowHud,
  ConnectLineHud,
  PlayerHud,
  TextHud,
  useHudPosition,
  ZoneHud,
} from './hud';

export interface ContextHudProps {
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<any>;
}

export function ContextHud({
  stageSize,
  pitchRect,
  nodesRegistryRef,
}: ContextHudProps) {
  const hudRef = useRef<HTMLDivElement>(null);
  const selectedObjects = useCanvasStore((s) => s.selectedObjects);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const isDragging = useCanvasStore((s) => s.isDragging);
  const isHudOpen = useCanvasStore((s) => s.isHudOpen);

  useEffect(() => {
    const stage = nodesRegistryRef?.current?.stage;
    if (!stage) return;
    const handleDragStart = () => {
      if (hudRef.current) hudRef.current.style.opacity = '0';
    };
    const handleDragEnd = () => {
      if (hudRef.current) hudRef.current.style.opacity = '1';
    };
    stage.on('dragstart', handleDragStart);
    stage.on('dragend', handleDragEnd);
    return () => {
      stage.off('dragstart', handleDragStart);
      stage.off('dragend', handleDragEnd);
    };
  }, [nodesRegistryRef]);

  const selected =
    selectedObjects.length === 1 ? selectedObjects[0] : undefined;
  const position = useHudPosition({
    selected,
    stageSize,
    pitchRect,
    nodesRegistryRef,
  });

  if (
    !selected ||
    activeTool === 'eraser' ||
    isDragging ||
    !isHudOpen ||
    !position
  ) {
    return null;
  }

  return (
    <div
      ref={hudRef}
      role="toolbar"
      aria-label="コンテキスト操作ツールバー"
      tabIndex={-1}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      style={{
        left: `${position.clampedX}px`,
        top: `${position.clampedY}px`,
        transform: position.isBelow
          ? 'translate(-50%, 0)'
          : 'translate(-50%, -100%)',
      }}
      className="absolute z-40 transition-opacity duration-150 select-none pointer-events-auto animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-neutral-900/90 backdrop-blur-md border border-white/15 shadow-2xl shadow-black/80 text-xs text-white">
        {selected.kind === 'player' && <PlayerHud playerId={selected.id} />}
        {selected.kind === 'arrow' && <ArrowHud arrowId={selected.id} />}
        {selected.kind === 'zone' && <ZoneHud zoneId={selected.id} />}
        {selected.kind === 'text' && <TextHud textId={selected.id} />}
        {selected.kind === 'connect-line' && (
          <ConnectLineHud
            connectLineId={selected.id}
            parentPlayerId={selected.parentPlayerId}
          />
        )}
      </div>
    </div>
  );
}
