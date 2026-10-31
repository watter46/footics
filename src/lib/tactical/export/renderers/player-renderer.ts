import {
  MARKER_PATHS,
  MARKER_VIEWBOX_SIZE,
  SPOTLIGHT_BEAM_BOTTOM_CENTER_X,
  SPOTLIGHT_BEAM_BOTTOM_MAX_Y,
  SPOTLIGHT_BEAM_BOTTOM_WIDTH,
  SPOTLIGHT_BEAM_PATH,
} from '@/lib/tactical/marker-assets';
import { getLastName } from '@/lib/tactical/player-formatting';
import type { InterpolatedPlayerState } from '@/lib/tactical/unified-interpolation';
import {
  type FrameRenderContext,
  getOpticalCenterX,
  TACTICAL_CANVAS_FONT_FAMILY,
} from './renderer-context';

const CACHED_SPOTLIGHT_BEAM_PATH: Path2D | null =
  typeof Path2D !== 'undefined' ? new Path2D(SPOTLIGHT_BEAM_PATH) : null;

const CACHED_COMBINED_MARKER_PATH: Path2D | null =
  typeof Path2D !== 'undefined' ? new Path2D(MARKER_PATHS.join(' ')) : null;

/**
 * Draws players (rings, circles, photos, numbers, labels, spotlights, cones) onto canvas context.
 */
export function renderPlayers(
  context: FrameRenderContext,
  players: Record<string, InterpolatedPlayerState>,
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>,
): void {
  const { ctx, w, h, m, projectObjToScreen, snap, toScreenSizeX } = context;

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
    const radius = Math.max(8, Math.round(w * 0.022 * sizeScale * depthScale));

    ctx.save();
    ctx.globalAlpha = p.opacity;

    // Spotlight Beam (Focus)
    if (p.focus?.enabled) {
      const focusColor = p.focus.color || '#ffffff';
      const focusOpacity = (p.focus.opacity ?? 0.35) * p.opacity;
      const focusRadiusMultiplier = (p.focus.radius ?? 3) / 3;
      const ringWidth = radius * 2.3 * focusRadiusMultiplier;
      const spotlightScale = ringWidth / SPOTLIGHT_BEAM_BOTTOM_WIDTH;
      const tx = px - SPOTLIGHT_BEAM_BOTTOM_CENTER_X * spotlightScale;
      // フォーカスの最下部をリング最下部 (py + radius * 0.55) に一致させる
      const ringBottomY = py + radius * 0.55 * focusRadiusMultiplier;
      const ty = ringBottomY - SPOTLIGHT_BEAM_BOTTOM_MAX_Y * spotlightScale;

      ctx.save();
      if (CACHED_SPOTLIGHT_BEAM_PATH) {
        ctx.save();
        ctx.translate(tx, ty);
        ctx.scale(spotlightScale, spotlightScale);

        // 光の柱（中央が透けるソフトグラデーションビーム）
        const grad = ctx.createLinearGradient(31.36, 5, 31.36, 100);
        const hex = focusColor.replace('#', '');
        const cr = Number.parseInt(hex.substring(0, 2), 16) || 255;
        const cg = Number.parseInt(hex.substring(2, 4), 16) || 255;
        const cb = Number.parseInt(hex.substring(4, 6), 16) || 255;

        const stops = [
          [0, 0.95],
          [0.25, 0.5],
          [0.6, 0.22],
          [0.9, 0.65],
          [1, 0.95],
        ] as const;
        for (const [offset, mul] of stops) {
          grad.addColorStop(
            offset,
            `rgba(${cr}, ${cg}, ${cb}, ${(focusOpacity * mul).toFixed(3)})`,
          );
        }

        ctx.fillStyle = grad;
        ctx.fill(CACHED_SPOTLIGHT_BEAM_PATH);
        ctx.restore();
      }
      ctx.restore();
    }

    // Vision Cone
    const isVisionConeVisible =
      p.visionCone?.visible || (p.visionCone as { enabled?: boolean })?.enabled;
    if (isVisionConeVisible && p.visionCone) {
      const cone = p.visionCone;
      const coneRadius = snap(toScreenSizeX(cone.radius || 20));
      const startAngle = cone.angleRad - cone.spreadRad / 2;
      const endAngle = cone.angleRad + cone.spreadRad / 2;
      const isRing = p.style?.markerType === 'ring';
      const rx = isRing ? radius * 1.15 : radius + 2;
      const ry = isRing ? radius * 0.55 : radius + 2;

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

      if (!m && !isRing) {
        ctx.moveTo(px, py);
        ctx.arc(px, py, coneRadius, startAngle, endAngle);
      } else {
        const steps = 36;
        if (!isRing) ctx.moveTo(px, py);
        for (let i = 0; i <= steps; i++) {
          const a = startAngle + (i / steps) * (endAngle - startAngle);
          const pt = getArcPoint(a);
          if (isRing && i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        if (isRing) {
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
    const isRingMarker = p.style?.markerType === 'ring';

    if (isRingMarker) {
      // ── 3D Foot Ring (立体足元楕円リング) ──
      const ringScale = (radius * 2) / MARKER_VIEWBOX_SIZE;
      const rtx = px - (MARKER_VIEWBOX_SIZE * ringScale) / 2;
      const rty = py - (MARKER_VIEWBOX_SIZE * ringScale) / 2;

      const ringColor =
        p.style?.color || (p.team === 'home' ? '#2563eb' : '#dc2626');

      if (CACHED_COMBINED_MARKER_PATH) {
        ctx.save();
        ctx.translate(rtx, rty);
        ctx.scale(ringScale, ringScale);

        // 各パーツから外側にふんわり光が漏れ出るグロー層
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = ringColor;
        ctx.shadowBlur = Math.round(8 * (w / 800));
        ctx.globalAlpha = p.opacity * 0.6;
        ctx.stroke(CACHED_COMBINED_MARKER_PATH);

        // 各パーツ本体 (シャープな発光コア)
        ctx.fillStyle = ringColor;
        ctx.shadowColor = ringColor;
        ctx.shadowBlur = Math.round(4 * (w / 800));
        ctx.globalAlpha = p.opacity;
        ctx.fill(CACHED_COMBINED_MARKER_PATH);
        ctx.restore();
      }

      // Ring Center Glow Ellipse (各パーツと同じ発光グロー効果)
      ctx.save();
      ctx.strokeStyle = ringColor;
      ctx.fillStyle = ringColor;
      ctx.shadowColor = ringColor;
      ctx.lineWidth = Math.round(2 * (w / 800));
      ctx.shadowBlur = Math.round(8 * (w / 800));
      ctx.globalAlpha = p.opacity * 0.6;
      ctx.beginPath();
      ctx.ellipse(px, py, radius * 0.72, radius * 0.24, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = p.opacity * 0.45;
      ctx.shadowBlur = Math.round(4 * (w / 800));
      ctx.beginPath();
      ctx.ellipse(px, py, radius * 0.68, radius * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3Dリング中央は何も表示しない仕様に統一
    } else {
      // ── 2D Player Circle ──
      // 1. Player Main Body (Team Color)
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle =
        p.style?.color || (p.team === 'home' ? '#2563eb' : '#dc2626');
      ctx.fill();

      // 2. Player Photo (insideContent === 'photo' かつ写真ソースがある場合)
      const photoSource =
        p.style?.insideContent === 'photo'
          ? (playerPhotos?.[p.id] ??
            (p.playerId ? playerPhotos?.[p.playerId] : undefined))
          : undefined;

      if (photoSource) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          photoSource,
          px - radius,
          py - radius,
          radius * 2,
          radius * 2,
        );
        ctx.restore();
      }

      // 3. Player Standard Stroke (White Ring)
      const strokeWidth = p.style?.strokeWidth ?? 2;
      ctx.lineWidth = Math.max(1.5, Math.round(strokeWidth * (w / 800)));
      ctx.strokeStyle = p.style?.strokeColor || '#ffffff';
      ctx.stroke();

      // 4. Shirt Number
      const showInsideNumber =
        !photoSource &&
        (p.style?.insideContent !== 'photo' || !photoSource) &&
        p.shirtNo;

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
