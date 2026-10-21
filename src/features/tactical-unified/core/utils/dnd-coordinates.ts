/**
 * dnd-coordinates.ts
 * Pure function to map pointer drop events to pitch normalized percentage coordinates (0..100)
 */

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
