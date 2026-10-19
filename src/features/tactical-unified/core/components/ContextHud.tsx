'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../hooks/use-canvas-store';
import type { SelectedObject } from '../types';
import {
  ArrowHud,
  ConnectLineHud,
  computeClampedHudPos,
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
  const hudRef = useRef<HTMLDivElement>(null);
  const selectedObjects = useCanvasStore((s) => s.selectedObjects);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const isHudOpen = useCanvasStore((s) => s.isHudOpen);

  const selected =
    selectedObjects.length === 1 ? selectedObjects[0] : undefined;
  const position = useHudPosition({
    selected,
    stageSize,
    pitchRect,
    nodesRegistryRef: nodesRegistryRef as any,
    resolveExtraTarget,
  });

  useEffect(() => {
    const reg = nodesRegistryRef?.current as
      | {
          stage?: {
            on: (event: string, fn: () => void) => void;
            off: (event: string, fn: () => void) => void;
          };
          playerNodes?: Map<
            string,
            {
              getClientRect: () => {
                x: number;
                y: number;
                width: number;
                height: number;
              };
            }
          >;
          arrowNodes?: Map<
            string,
            {
              node?: {
                getClientRect: () => {
                  x: number;
                  y: number;
                  width: number;
                  height: number;
                };
              };
            }
          >;
          zoneNodes?: Map<
            string,
            {
              getClientRect: () => {
                x: number;
                y: number;
                width: number;
                height: number;
              };
            }
          >;
          textNodes?: Map<
            string,
            {
              getClientRect: () => {
                x: number;
                y: number;
                width: number;
                height: number;
              };
            }
          >;
          ballNode?: {
            getClientRect: () => {
              x: number;
              y: number;
              width: number;
              height: number;
            };
          };
        }
      | undefined;
    const stage = reg?.stage;
    if (!stage || !selected) return;

    const handleDragMove = () => {
      if (!hudRef.current) return;
      let node:
        | {
            getClientRect: () => {
              x: number;
              y: number;
              width: number;
              height: number;
            };
          }
        | undefined;
      if (selected.kind === 'player') node = reg.playerNodes?.get(selected.id);
      else if (selected.kind === 'arrow')
        node = reg.arrowNodes?.get(selected.id)?.node;
      else if (selected.kind === 'zone') node = reg.zoneNodes?.get(selected.id);
      else if (selected.kind === 'text') node = reg.textNodes?.get(selected.id);
      else if (selected.kind === 'ball') node = reg.ballNode;

      if (!node) return;
      try {
        const rect = node.getClientRect();
        const targetX = rect.x + rect.width / 2;
        const targetY = rect.y;
        const targetHeight = rect.height || 30;
        const next = computeClampedHudPos(
          targetX,
          targetY,
          targetHeight,
          stageSize,
        );
        hudRef.current.style.left = `${next.clampedX}px`;
        hudRef.current.style.top = `${next.clampedY}px`;
        hudRef.current.style.transform = next.isBelow
          ? 'translate(-50%, 0)'
          : 'translate(-50%, -100%)';
      } catch {
        // fallback
      }
    };

    stage.on('dragmove', handleDragMove);
    return () => {
      stage.off('dragmove', handleDragMove);
    };
  }, [nodesRegistryRef, selected, stageSize]);

  if (!selected || activeTool === 'eraser' || !isHudOpen || !position) {
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
