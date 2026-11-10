/**
 * animation-ripple-updater.ts
 * Manages player ripple pulse animation Konva nodes
 */
import Konva from 'konva';
import { computeRippleRings } from '@/lib/tactical/effect-geometry';
import type { InterpolatedPlayerState } from '@/lib/tactical/unified-interpolation';

const rippleNodesCache = new WeakMap<Konva.Group, Konva.Circle[]>();

export function updatePlayerRippleRings(
  playerGroup: Konva.Group,
  pState: InterpolatedPlayerState,
  timeInSlideMs: number,
  isPlaying: boolean,
): void {
  if (typeof playerGroup.find !== 'function') {
    return;
  }

  const markerEffect = pState.style?.markerEffect;
  let existingRings = rippleNodesCache.get(playerGroup);
  if (!existingRings) {
    existingRings = playerGroup.find<Konva.Circle>('.ripple-ring');
  }

  if (!isPlaying || !markerEffect || markerEffect.type !== 'ripple') {
    for (const ring of existingRings) {
      ring.visible(false);
    }
    if (existingRings.length >= 3) {
      rippleNodesCache.set(playerGroup, existingRings);
    }
    return;
  }

  const sizeScale = pState.style?.sizeScale ?? 1.0;
  const baseRadius = 15 * sizeScale;
  const rings = computeRippleRings(timeInSlideMs, markerEffect, baseRadius);

  while (existingRings.length < rings.length) {
    const newRing = new Konva.Circle({
      name: 'ripple-ring',
      listening: false,
      strokeWidth: 2,
    });
    playerGroup.add(newRing);
    newRing.moveToBottom();
    existingRings.push(newRing);
  }

  if (existingRings.length >= 3 || existingRings.length >= rings.length) {
    rippleNodesCache.set(playerGroup, existingRings);
  }

  for (let i = 0; i < existingRings.length; i++) {
    const ringNode = existingRings[i];
    if (i < rings.length) {
      const ringData = rings[i];
      ringNode.radius(ringData.radius);
      ringNode.stroke(ringData.color || pState.style?.color || '#38bdf8');
      ringNode.opacity(ringData.opacity * pState.opacity);
      ringNode.visible(pState.visible && ringData.opacity > 0);
    } else {
      ringNode.visible(false);
    }
  }
}
