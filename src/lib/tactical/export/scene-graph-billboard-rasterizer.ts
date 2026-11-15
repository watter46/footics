import type {
  ResolvedBillboardItem,
  ResolvedBillboardPlayerItem,
  ResolvedBillboardTextItem,
} from '@/lib/tactical/compiler/scene-graph-dto';
import { getLastName } from '@/lib/tactical/player-formatting';
import { renderPlayerRingMarker } from './renderers/player-ring-renderer';
import {
  type AnyCanvasRenderingContext2D,
  getOpticalCenterX,
  TACTICAL_CANVAS_FONT_FAMILY,
} from './renderers/renderer-context';
import { drawSoccerBall } from './scene-graph-ball-rasterizer';

function isDrawablePhoto(
  source: CanvasImageSource | null | undefined,
): boolean {
  if (!source) return false;
  return typeof ImageBitmap === 'undefined' || !(source instanceof ImageBitmap)
    ? true
    : source.width > 0 && source.height > 0;
}

export function renderPlayerItem(
  ctx: AnyCanvasRenderingContext2D,
  item: ResolvedBillboardPlayerItem,
  playerPhotos?: Readonly<Record<string, CanvasImageSource | null | undefined>>,
): void {
  if (!item.visible || item.opacity <= 0) return;

  const player = item.player;
  const px = item.positionPx.x;
  const py = item.positionPx.y;
  const radius = item.radiusPx;
  const markerColor =
    player.style?.color || (player.team === 'home' ? '#2563eb' : '#dc2626');
  const isRingMarker =
    player.style?.markerType === 'ring' ||
    player.style?.markerType === 'ring-fade';

  ctx.save();
  ctx.globalAlpha = item.opacity;

  // 0. Focus & Vision Cone
  if (item.focus && item.focus.enabled) {
    ctx.save();
    ctx.globalAlpha = item.opacity * item.focus.opacity;
    ctx.beginPath();
    ctx.arc(px, py, item.focus.radiusPx, 0, Math.PI * 2);
    if (item.focus.style === 'ring') {
      ctx.strokeStyle = item.focus.color;
      ctx.lineWidth = Math.max(2, item.radiusPx * 0.2);
      ctx.stroke();
    } else {
      ctx.fillStyle = item.focus.color;
      ctx.fill();
    }
    ctx.restore();
  }

  if (item.visionCone && item.visionCone.visible) {
    ctx.save();
    ctx.globalAlpha = item.opacity * item.visionCone.opacity;
    ctx.fillStyle = item.visionCone.color;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(
      px,
      py,
      item.visionCone.radiusPx,
      item.visionCone.angleRad - item.visionCone.spreadRad / 2,
      item.visionCone.angleRad + item.visionCone.spreadRad / 2,
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 1. Ripple Rings
  if (item.rippleRingsPx && item.rippleRingsPx.length > 0) {
    ctx.save();
    ctx.lineWidth = Math.max(1.5, Math.round(2 * (radius / 18)));
    for (const ring of item.rippleRingsPx) {
      if (ring.opacity <= 0) continue;
      ctx.save();
      ctx.strokeStyle = ring.color || markerColor;
      ctx.globalAlpha = item.opacity * ring.opacity;
      ctx.beginPath();
      ctx.arc(px, py, ring.radiusPx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // 2. Player Marker
  if (isRingMarker) {
    const scale = radius / 18;
    const interpolatedPlayer = {
      ...player,
      opacity: item.opacity,
      visible: item.visible,
    };
    renderPlayerRingMarker(
      ctx,
      interpolatedPlayer,
      px,
      py,
      radius,
      scale,
      markerColor,
    );
  } else {
    // 2D Circle
    if (!player.style?.transparentBackground) {
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = markerColor;
      ctx.fill();
    }

    const photoSource =
      player.style?.insideContent === 'photo'
        ? (playerPhotos?.[player.id] ??
          (player.playerId ? playerPhotos?.[player.playerId] : undefined))
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

    const isPhotoMarker = player.style?.insideContent === 'photo';
    const isSelected = item.selected;
    if (
      !photoRendered &&
      (!isPhotoMarker || isSelected) &&
      (player.style?.strokeWidth ?? 2) > 0
    ) {
      const strokeWidth = isSelected ? 3 : (player.style?.strokeWidth ?? 2);
      ctx.lineWidth = Math.max(1.5, strokeWidth);
      ctx.strokeStyle = isSelected
        ? '#60a5fa'
        : player.style?.strokeColor || '#ffffff';
      ctx.stroke();
    }

    const showInsideNumber = !photoRendered && player.shirtNo;
    if (showInsideNumber && player.shirtNo) {
      const numScale = player.style?.numberSizeScale ?? 1.0;
      const numFontSize = Math.max(8, Math.round(radius * 0.9 * numScale));
      ctx.font = `bold ${numFontSize}px ${TACTICAL_CANVAS_FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(
        player.shirtNo,
        getOpticalCenterX(ctx, player.shirtNo, px),
        py,
      );
    }
  }

  // 3. Bottom Label
  const showName =
    (player.style?.bottomLabel === 'name' ||
      player.style?.bottomLabel === undefined) &&
    player.name;
  const showBottomNum =
    player.style?.bottomLabel === 'number' && player.shirtNo;
  if (showName || showBottomNum) {
    const labelText = showName
      ? getLastName(player.name ?? '')
      : `#${player.shirtNo ?? ''}`;
    const labelScale = player.style?.labelSizeScale ?? 1.0;
    const fontSize = Math.max(8, Math.round(radius * 0.65 * labelScale));
    const textY = py + radius + fontSize * 0.7 + 3;

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
}

export function renderTextItem(
  ctx: AnyCanvasRenderingContext2D,
  item: ResolvedBillboardTextItem,
): void {
  if (!item.visible || item.opacity <= 0 || !item.content) return;

  ctx.save();
  ctx.globalAlpha = item.opacity;
  const fontStyle = `${item.bold ? 'bold ' : ''}${item.italic ? 'italic ' : ''}`;
  ctx.font = `${fontStyle}${item.fontSizePx}px ${TACTICAL_CANVAS_FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  if (typeof ctx.strokeText === 'function') {
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = Math.max(3, Math.round(item.fontSizePx * 0.32));
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeText(item.content, item.positionPx.x, item.positionPx.y);
  }

  ctx.fillStyle = item.color || '#ffffff';
  ctx.fillText(item.content, item.positionPx.x, item.positionPx.y);

  ctx.restore();
}

export function renderBillboardItem(
  ctx: AnyCanvasRenderingContext2D,
  item: ResolvedBillboardItem,
  playerPhotos?: Readonly<Record<string, CanvasImageSource | null | undefined>>,
): void {
  if (item.kind === 'player') {
    renderPlayerItem(ctx, item, playerPhotos);
  } else if (item.kind === 'ball') {
    drawSoccerBall(ctx, item);
  } else if (item.kind === 'text') {
    renderTextItem(ctx, item);
  }
}
