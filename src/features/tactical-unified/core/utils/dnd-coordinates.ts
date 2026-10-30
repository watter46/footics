/**
 * dnd-coordinates.ts
 * Pure function to map pointer drop events to pitch normalized percentage coordinates (0..100)
 */

import type { DragEndEvent } from '@dnd-kit/core';

export interface BoundingRectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ClientPointLike {
  clientX: number;
  clientY: number;
}

export interface TacticalDndEndHandlers {
  activeSlideId: string;
  movePlayerToPitch: (
    slideId: string,
    playerId: string,
    x: number,
    y: number,
  ) => void;
  movePlayerToBench: (slideId: string, playerId: string) => void;
}

export function calculateDropPitchCoords(
  overRect: BoundingRectLike,
  dropClientPos: ClientPointLike,
): { x: number; y: number } {
  if (overRect.width <= 0 || overRect.height <= 0) {
    return { x: 50, y: 50 };
  }
  const relX = dropClientPos.clientX - overRect.left;
  const relY = dropClientPos.clientY - overRect.top;
  const rawX = (relX / overRect.width) * 100;
  const rawY = (relY / overRect.height) * 100;

  // ピッチ外への過度はみ出しを防ぎ、安全なピッチ内領域(5..95)へ収める
  const x = Math.max(5, Math.min(95, Math.round(rawX)));
  const y = Math.max(5, Math.min(95, Math.round(rawY)));

  return { x, y };
}

export function handleTacticalDndEnd(
  event: DragEndEvent,
  handlers: TacticalDndEndHandlers,
): void {
  const { active, over } = event;
  if (!over) return;

  const activeData = active.data.current;
  if (
    activeData?.type === 'bench-player' &&
    over.id === 'tactical-pitch-droppable'
  ) {
    const activator = event.activatorEvent as
      | MouseEvent
      | TouchEvent
      | PointerEvent;
    let rawClientX = 0;
    let rawClientY = 0;
    if (
      activator &&
      'clientX' in activator &&
      typeof activator.clientX === 'number'
    ) {
      rawClientX = activator.clientX;
      rawClientY = activator.clientY;
    } else if (
      activator &&
      'touches' in activator &&
      (activator as TouchEvent).touches?.[0]
    ) {
      rawClientX = (activator as TouchEvent).touches[0]?.clientX ?? 0;
      rawClientY = (activator as TouchEvent).touches[0]?.clientY ?? 0;
    }
    const clientX = rawClientX + event.delta.x;
    const clientY = rawClientY + event.delta.y;

    let normCoords = { x: 50, y: 50 };
    if (over.rect) {
      normCoords = calculateDropPitchCoords(over.rect, { clientX, clientY });
    }

    handlers.movePlayerToPitch(
      handlers.activeSlideId,
      activeData.playerId,
      normCoords.x,
      normCoords.y,
    );
  } else if (over.id === 'tactical-bench-droppable') {
    const playerId =
      activeData?.playerId ||
      String(active.id).replace('pitch-player-', '').replace('marker-', '');
    if (playerId) {
      handlers.movePlayerToBench(handlers.activeSlideId, playerId);
    }
  }
}
