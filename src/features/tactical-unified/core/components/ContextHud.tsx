'use client';

import { flip, offset, shift, useFloating } from '@floating-ui/react';
import type React from 'react';
import { useEffect } from 'react';
import { useCanvasStore } from '../hooks/use-canvas-store';
import type { SelectedObject } from '../types';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import {
  ArrowHud,
  ConnectLineHud,
  type HudOffsetRect,
  type HudTarget,
  PlayerHud,
  TextHud,
  useHudPosition,
  ZoneHud,
} from './hud';

export interface ContextHudProps {
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<unknown>;
  renderExtraHud?: (selected: SelectedObject) => React.ReactNode;
  resolveExtraTarget?: (
    selected: SelectedObject,
    offset: HudOffsetRect,
  ) => HudTarget | null;
}

export function ContextHud({
  stageSize,
  pitchRect,
  nodesRegistryRef,
  renderExtraHud,
  resolveExtraTarget,
}: ContextHudProps) {
  const selectedObjects = useCanvasStore((s) => s.selectedObjects);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const isHudOpen = useCanvasStore((s) => s.isHudOpen);
  const isDragging = useCanvasStore((s) => s.isDragging);

  const selected =
    selectedObjects.length === 1 ? selectedObjects[0] : undefined;
  const position = useHudPosition({
    selected,
    stageSize,
    pitchRect,
    nodesRegistryRef: nodesRegistryRef as
      | React.MutableRefObject<CanvasNodesRegistry>
      | undefined,
    resolveExtraTarget,
  });

  const { refs, x, y, placement } = useFloating({
    placement: position?.isBelow ? 'bottom' : 'top',
    strategy: 'absolute',
    middleware: [
      offset(16),
      flip({ boundary: 'clippingAncestors', padding: 10 }),
      shift({ padding: 10 }),
    ],
  });

  const { setReference, setFloating } = refs;

  useEffect(() => {
    if (!position) return;
    const tx = position.targetX ?? position.clampedX;
    const ty = position.targetY ?? position.clampedY;
    const th = position.targetHeight ?? 30;
    setReference({
      getBoundingClientRect() {
        return {
          width: 0,
          height: th,
          x: tx,
          y: ty - th / 2,
          top: ty - th / 2,
          bottom: ty + th / 2,
          left: tx,
          right: tx,
        };
      },
    });
  }, [
    position?.targetX,
    position?.targetY,
    position?.targetHeight,
    position?.clampedX,
    position?.clampedY,
    setReference,
  ]);

  if (
    isDragging ||
    !selected ||
    activeTool === 'eraser' ||
    !isHudOpen ||
    !position
  ) {
    return null;
  }

  const resolvedLeft = x ? Math.round(x) : position.clampedX;
  const resolvedTop = y ? Math.round(y) : position.clampedY;
  const isBelow = placement.startsWith('bottom') || (!x && position.isBelow);

  return (
    <div
      ref={setFloating}
      role="toolbar"
      aria-label="コンテキスト操作ツールバー"
      tabIndex={-1}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      style={{
        left: `${resolvedLeft}px`,
        top: `${resolvedTop}px`,
        transform: x
          ? undefined
          : isBelow
            ? 'translate(-50%, 0)'
            : 'translate(-50%, -100%)',
      }}
      className="absolute z-40 transition-opacity duration-150 select-none pointer-events-auto animate-in fade-in zoom-in-95 duration-100"
    >
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#222222] border border-[#383838] shadow-xl text-xs text-white"
        style={{
          backgroundColor: '#222222',
          borderColor: '#383838',
          color: '#ffffff',
        }}
      >
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
        {renderExtraHud?.(selected)}
      </div>
    </div>
  );
}
