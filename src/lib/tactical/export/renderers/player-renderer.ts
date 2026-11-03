import {
  MARKER_PATHS,
  MARKER_VIEWBOX_SIZE,
} from '@/lib/tactical/marker-assets';
import { calculatePitchRect } from '@/lib/tactical/pitch-geometry';
import { getLastName } from '@/lib/tactical/player-formatting';
import type { InterpolatedPlayerState } from '@/lib/tactical/unified-interpolation';
import { renderPlayerFocus } from './player-focus-renderer';
import {
  type FrameRenderContext,
  getOpticalCenterX,
  TACTICAL_CANVAS_FONT_FAMILY,
} from './renderer-context';

const CACHED_COMBINED_MARKER_PATH: Path2D | null =
  typeof Path2D !== 'undefined' ? new Path2D(MARKER_PATHS.join(' ')) : null;

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

    ctx.save();
    ctx.globalAlpha = p.opacity;

    const isRingMarker =
      p.style?.markerType === 'ring' || p.style?.markerType === 'ring-fade';

    // ── Spotlight Beam / 2D Focus Glow ──
    renderPlayerFocus(ctx, p, px, py, radius, scale, isRingMarker);

    // ── Vision Cone ──
    const isVisionConeVisible =
      p.visionCone?.visible || (p.visionCone as { enabled?: boolean })?.enabled;
    if (isVisionConeVisible && p.visionCone) {
      const cone = p.visionCone;
      const coneRadius = snap(toScreenSizeX(cone.radius || 20));
      const startAngle = cone.angleRad - cone.spreadRad / 2;
      const endAngle = cone.angleRad + cone.spreadRad / 2;
      const rx = isRingMarker ? radius * 1.15 : radius + 2;
      const ry = isRingMarker ? radius * 0.55 : radius + 2;

      ctx.save();
      ctx.globalAlpha = (cone.opacity ?? 0.25) * p.opacity;
      ctx.fillStyle = cone.color || p.style?.color || '#3b82f6';
      ctx.beginPath();

      const getArcPoint = (a: number) => {
        if (m) {
          const nx = p.x + ((Math.cos(a) * coneRadius) / w) * 100;
          const ny = p.y + ((Math.sin(a) * coneRadius) / h) * 100;
          return projectObjToScreen(nx, ny);
        }
        return {
          x: px + coneRadius * Math.cos(a),
          y: py + coneRadius * Math.sin(a),
        };
      };

      if (!m && !isRingMarker) {
        ctx.moveTo(px, py);
        ctx.arc(px, py, coneRadius, startAngle, endAngle);
      } else {
        const steps = 36;
        if (!isRingMarker) ctx.moveTo(px, py);
        for (let i = 0; i <= steps; i++) {
          const a = startAngle + (i / steps) * (endAngle - startAngle);
          const pt = getArcPoint(a);
          if (isRingMarker && i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        if (isRingMarker) {
          for (let i = steps; i >= 0; i--) {
            const a = startAngle + (i / steps) * (endAngle - startAngle);
            ctx.lineTo(px + rx * Math.cos(a), py + ry * Math.sin(a));
          }
        }
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = cone.color || p.style?.color || '#3b82f6';
      ctx.lineWidth = Math.max(1, Math.round(w * 0.0015));
      ctx.stroke();
      ctx.restore();
    }

    // ── 100% Visual Parity with player-layer.tsx ──
    const markerColor =
      p.style?.color || (p.team === 'home' ? '#2563eb' : '#dc2626');

    if (p.style?.markerType === 'ring') {
      // ── 3D Foot Ring (立体足元楕円リング) ──
      const ringScale = (radius * 2) / MARKER_VIEWBOX_SIZE;
      const rtx = px - (MARKER_VIEWBOX_SIZE * ringScale) / 2;
      const rty = py - (MARKER_VIEWBOX_SIZE * ringScale) / 2;

      if (CACHED_COMBINED_MARKER_PATH) {
        ctx.save();
        ctx.translate(rtx, rty);
        ctx.scale(ringScale, ringScale);

        // 各パーツから外側にふんわり光が漏れ出るグロー層
        ctx.strokeStyle = markerColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = markerColor;
        ctx.shadowBlur = Math.round(8 * scale);
        ctx.globalAlpha = p.opacity * 0.6;
        ctx.stroke(CACHED_COMBINED_MARKER_PATH);

        // 各パーツ本体 (シャープな発光コア)
        ctx.fillStyle = markerColor;
        ctx.shadowBlur = Math.round(4 * scale);
        ctx.globalAlpha = p.opacity;
        ctx.fill(CACHED_COMBINED_MARKER_PATH);
        ctx.restore();
      }

      // Ring Center Glow Ellipse (各パーツと同じ発光グロー効果)
      ctx.save();
      ctx.strokeStyle = markerColor;
      ctx.fillStyle = markerColor;
      ctx.shadowColor = markerColor;
      ctx.lineWidth = Math.round(2 * scale);
      ctx.shadowBlur = Math.round(8 * scale);
      ctx.globalAlpha = p.opacity * 0.6;
      ctx.beginPath();
      ctx.ellipse(px, py, radius * 0.72, radius * 0.24, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = p.opacity * 0.45;
      ctx.shadowBlur = Math.round(4 * scale);
      ctx.beginPath();
      ctx.ellipse(px, py, radius * 0.68, radius * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3Dリング中央は何も表示しない仕様に統一
    } else if (p.style?.markerType === 'ring-fade') {
      // ── Ring Fade (フェード足元楕円リング) ──
      ctx.save();
      ctx.strokeStyle = markerColor;
      ctx.fillStyle = markerColor;
      ctx.shadowColor = markerColor;

      // 外側フェードグロー
      ctx.lineWidth = Math.max(3 * scale, 3);
      ctx.shadowBlur = Math.round(10 * scale);
      ctx.globalAlpha = p.opacity * 0.5;
      ctx.beginPath();
      ctx.ellipse(px, py, radius * 0.95, radius * 0.38, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 内側コア楕円リング
      ctx.lineWidth = Math.max(2 * scale, 2);
      ctx.shadowBlur = Math.round(4 * scale);
      ctx.globalAlpha = p.opacity * 0.85;
      ctx.beginPath();
      ctx.ellipse(px, py, radius * 0.95, radius * 0.38, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 足元中央の薄いフェード塗り
      ctx.globalAlpha = p.opacity * 0.15;
      ctx.beginPath();
      ctx.ellipse(px, py, radius * 0.9, radius * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // ── 2D Player Circle ──
      // 1. Player Main Body (Team Color)
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = markerColor;
      ctx.fill();

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
      if (!photoRendered && (p.style?.strokeWidth ?? 2) > 0) {
        const strokeWidth = p.style?.strokeWidth ?? 2;
        ctx.lineWidth = Math.max(1.5, Math.round(strokeWidth * scale));
        ctx.strokeStyle = p.style?.strokeColor || '#ffffff';
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
