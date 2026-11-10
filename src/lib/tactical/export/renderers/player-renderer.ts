import {
  computeRippleRings,
  type RippleRing,
} from '@/lib/tactical/effect-geometry';
import { calculatePitchRect } from '@/lib/tactical/pitch-geometry';
import { getLastName } from '@/lib/tactical/player-formatting';
import type { InterpolatedPlayerState } from '@/lib/tactical/unified-interpolation';
import { renderPlayerVisionCone } from './player-cone-renderer';
import { renderPlayerFocus } from './player-focus-renderer';
import { renderPlayerRingMarker } from './player-ring-renderer';
import { renderPlayerTrajectory } from './player-trajectory-renderer';
import {
  type FrameRenderContext,
  getOpticalCenterX,
  TACTICAL_CANVAS_FONT_FAMILY,
} from './renderer-context';

function isDrawablePhoto(
  source: CanvasImageSource | null | undefined,
): boolean {
  if (!source) return false;
  return typeof ImageBitmap === 'undefined' || !(source instanceof ImageBitmap)
    ? true
    : source.width > 0 && source.height > 0;
}

/**
 * Draws players (rings, circles, photos, numbers, labels, spotlights, cones) onto canvas context.
 */
export function renderPlayers(
  context: FrameRenderContext,
  players: Record<string, InterpolatedPlayerState>,
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>,
  teamVisibility?: 'both' | 'home' | 'away',
  playerRings?: Record<string, RippleRing[]>,
  timeInSlideMs?: number,
): void {
  const { ctx, w, h, m, projectObjToScreen, snap, toScreenSizeX } = context;
  const aspectRatio = context.aspectRatio ?? '16:9';
  const pitchRect = calculatePitchRect({ width: w, height: h }, aspectRatio);
  const baseDim = Math.min(pitchRect.width, pitchRect.height);

  // 3D透視投影時は投影後の画面Y座標昇順（奥から手前）にソートして重なり順序を保証
  const sortedPlayers = Object.values(players)
    .slice()
    .sort(
      (a, b) => projectObjToScreen(a.x, a.y).y - projectObjToScreen(b.x, b.y).y,
    );

  sortedPlayers.forEach((p) => {
    if (!p.visible) return;
    const isPlayerVisible =
      !teamVisibility ||
      teamVisibility === 'both' ||
      p.team === 'neutral' ||
      p.team === teamVisibility;
    if (!isPlayerVisible) return;
    const _pp = projectObjToScreen(p.x, p.y);
    const px = snap(_pp.x);
    const py = snap(_pp.y);
    const sizeScale =
      (p as { scale?: number }).scale ?? p.style?.sizeScale ?? 1.0;
    const hasPerspectiveTilt = Boolean(
      m && (Math.abs(m[7]) > 1e-5 || Math.abs(m[3]) > 1e-5),
    );
    const depthScale = hasPerspectiveTilt
      ? Math.max(0.75, Math.min(1.25, 0.88 + (p.y / 100) * 0.24))
      : 1;
    const radius = Math.max(
      8,
      Math.round(baseDim * 0.032 * sizeScale * depthScale),
    );
    const scale = w / 800;
    const markerColor =
      p.style?.color || (p.team === 'home' ? '#2563eb' : '#dc2626');

    ctx.save();
    ctx.globalAlpha = p.opacity;

    const isRingMarker =
      p.style?.markerType === 'ring' || p.style?.markerType === 'ring-fade';

    // ── Spotlight Beam / 2D Focus Glow ──
    renderPlayerFocus(ctx, p, px, py, radius, scale, isRingMarker);

    // ── Vision Cone ──
    renderPlayerVisionCone(context, p, px, py, radius, isRingMarker);

    // ── Player Ghost Trajectory Effect ──
    renderPlayerTrajectory(context, p, px, py, scale);

    // ── Ripple Rings ──
    const markerEffect = p.style?.markerEffect;
    let rings: RippleRing[] | undefined = playerRings?.[p.id];
    if (
      !rings &&
      timeInSlideMs !== undefined &&
      markerEffect &&
      markerEffect.type === 'ripple'
    ) {
      rings = computeRippleRings(timeInSlideMs, markerEffect, radius);
    }

    if (rings && rings.length > 0) {
      ctx.save();
      ctx.lineWidth = Math.max(1.5, Math.round(2 * scale));
      for (const ring of rings) {
        if (ring.opacity <= 0) continue;
        ctx.save();
        ctx.strokeStyle = ring.color || markerColor;
        ctx.globalAlpha = p.opacity * ring.opacity;
        ctx.beginPath();
        ctx.arc(px, py, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    // ── 100% Visual Parity with player-layer.tsx ──
    if (isRingMarker) {
      renderPlayerRingMarker(ctx, p, px, py, radius, scale, markerColor);
    } else {
      // ── 2D Player Circle ──
      // 1. Player Main Body (Team Color)
      if (!p.style?.transparentBackground) {
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = markerColor;
        ctx.fill();
      }

      // 2. Player Photo (insideContent === 'photo' かつ写真ソースがある場合)
      const photoSource =
        p.style?.insideContent === 'photo'
          ? (playerPhotos?.[p.id] ??
            (p.playerId ? playerPhotos?.[p.playerId] : undefined))
          : undefined;

      let photoRendered = false;
      if (isDrawablePhoto(photoSource)) {
        ctx.save();
        try {
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(
            photoSource as CanvasImageSource,
            px - radius,
            py - radius,
            radius * 2,
            radius * 2,
          );
          ctx.restore();
          photoRendered = true;
        } catch {
          ctx.restore();
          photoRendered = false;
        }
      }

      // 3. Player Standard Stroke (White Ring)
      const isPhotoMarker = p.style?.insideContent === 'photo';
      const isSelected = Boolean(
        (p as { isSelected?: boolean; selected?: boolean }).isSelected ||
          (p as { isSelected?: boolean; selected?: boolean }).selected,
      );
      if (
        !photoRendered &&
        (!isPhotoMarker || isSelected) &&
        (p.style?.strokeWidth ?? 2) > 0
      ) {
        const strokeWidth = isSelected ? 3 : (p.style?.strokeWidth ?? 2);
        ctx.lineWidth = Math.max(1.5, Math.round(strokeWidth * scale));
        ctx.strokeStyle = isSelected
          ? '#60a5fa'
          : p.style?.strokeColor || '#ffffff';
        ctx.stroke();
      }

      // 4. Shirt Number
      const showInsideNumber = !photoRendered && p.shirtNo;

      if (showInsideNumber && p.shirtNo) {
        const numScale = p.style?.numberSizeScale ?? 1.0;
        const numFontSize = Math.max(8, Math.round(radius * 0.9 * numScale));
        ctx.font = `bold ${numFontSize}px ${TACTICAL_CANVAS_FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(p.shirtNo, getOpticalCenterX(ctx, p.shirtNo, px), py);
      }
    }

    // 4. Player Name / Number Label (Matching player-layer.tsx bottom label)
    const showName =
      (p.style?.bottomLabel === 'name' || p.style?.bottomLabel === undefined) &&
      p.name;
    const showBottomNum = p.style?.bottomLabel === 'number' && p.shirtNo;
    if (showName || showBottomNum) {
      const labelText = showName
        ? getLastName(p.name ?? '')
        : `#${p.shirtNo ?? ''}`;
      const labelScale = p.style?.labelSizeScale ?? 1.0;
      const fontSize = Math.max(8, Math.round(radius * 0.65 * labelScale));
      const textY = snap(py + radius + fontSize * 0.7 + 3);

      ctx.font = `bold ${fontSize}px ${TACTICAL_CANVAS_FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (typeof ctx.strokeText === 'function') {
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.25));
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(labelText, px, textY);
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, px, textY);
    }

    ctx.restore();
  });
}
