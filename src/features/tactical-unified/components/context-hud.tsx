'use client';

/**
 * context-hud.tsx
 * Floating Contextual Action Bar (HUD) for selected canvas objects.
 *
 * Provides instant on-pitch editing for:
 *  - Player: shirtNo, fill color, ring/stroke color, circle/ring toggle, delete
 *  - Arrow: stroke width, solid/dash toggle, color, delete
 *  - Zone: color, opacity, delete
 *  - Text: font size, color, delete
 *  - Ball: lock/unlock
 */

import type React from 'react';
import { useEffect, useRef } from 'react';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import type { CanvasNodesRegistry } from './canvas/canvas-registry';
import {
  ArrowHud,
  BallHud,
  PlayerHud,
  TextHud,
  useHudPosition,
  ZoneHud,
} from './hud';

export interface ContextHudProps {
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

export function ContextHud({
  stageSize,
  pitchRect,
  nodesRegistryRef,
}: ContextHudProps) {
  const hudRef = useRef<HTMLDivElement>(null);

  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);

  // ドラッグ中は直接DOM参照で一時的にHUDを非表示にしてRule 15に適合
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

  // 単一選択時のみ表示
  if (selectedObjects.length !== 1 || !activeSlide || activeTool === 'eraser') {
    return null;
  }

  const selected = selectedObjects[0];
  const position = useHudPosition({
    selected,
    activeSlide,
    stageSize,
    pitchRect,
    nodesRegistryRef,
  });

  if (!position) return null;

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
        {selected.kind === 'ball' && <BallHud />}
      </div>
    </div>
  );
}
