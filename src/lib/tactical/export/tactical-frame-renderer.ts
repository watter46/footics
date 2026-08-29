/**
 * tactical-frame-renderer.ts
 * High-performance, 100% deterministic 2D canvas renderer for Tactical Unified animations.
 *
 * Used for:
 *   - Offline MP4 video encoding (WebCodecs & mp4-muxer / MediaRecorder)
 *   - Offline Transparent WebM overlay encoding (MediaRecorder / VP9)
 *   - Real-time Animation Preview Player (Export Modal)
 *   - Snapshot / GIF frame rendering
 */

import { getLastName } from '@/lib/tactical/player-formatting';
import { getInterpolatedUnifiedSlideFrame } from '@/lib/tactical/unified-interpolation';
import type {
  AspectRatio,
  BoundaryBox,
  Slide,
} from '@/lib/types/tactical-unified';

export interface RenderTacticalFrameOptions {
  slides: Slide[];
  timeMs: number;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  boundaryBox?: BoundaryBox | null;
  transparent?: boolean;
}

export type AnyCanvasRenderingContext2D =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

/**
 * Draws a complete tactical animation frame onto a 2D canvas context.
 */
export function renderTacticalFrameToCanvas(
  ctx: AnyCanvasRenderingContext2D,
  options: RenderTacticalFrameOptions,
): void {
  const {
    slides,
    timeMs,
    width: w,
    height: h,
    aspectRatio,
    boundaryBox,
    transparent = false,
  } = options;

  if (w <= 0 || h <= 0) return;

  const isBoundaryActive =
    boundaryBox?.enabled &&
    boundaryBox.width > 0 &&
    boundaryBox.height > 0 &&
    (boundaryBox.width < 100 ||
      boundaryBox.height < 100 ||
      boundaryBox.x > 0 ||
      boundaryBox.y > 0);

  let cropX = 0;
  let cropY = 0;
  let cropW = 100;
  let cropH = 100;

  if (isBoundaryActive && boundaryBox) {
    cropX = boundaryBox.x;
    cropY = boundaryBox.y;
    cropW = boundaryBox.width;
    cropH = boundaryBox.height;
  }

  const scaleX = w / cropW;
  const scaleY = h / cropH;
  const toScreenX = (normX: number) => (normX - cropX) * scaleX;
  const toScreenY = (normY: number) => (normY - cropY) * scaleY;
  const toScreenSizeX = (normSize: number) => normSize * scaleX;
  const toScreenSizeY = (normSize: number) => normSize * scaleY;

  // Pixel grid snapping helpers to eliminate subpixel antialias fuzziness
  const snap = (v: number) => Math.round(v);

  // 1. Background & Pitch Markings
  if (transparent) {
    ctx.clearRect(0, 0, w, h);
  } else {
    // Solid pitch background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    // Pitch markings (standard pitch geometry normalized to 0-100 coordinate space)
    ctx.save();
    // Warm gold pitch markings matching browser pitch-background.tsx exactly (#e2b48d @ 0.85)
    ctx.strokeStyle = '#e2b48d';
    ctx.fillStyle = 'none';
    // Even-pixel width guarantees symmetrical rasterization without subpixel blur
    const pitchLineWidth = Math.max(2, Math.round((w * 0.003) / 2) * 2);
    ctx.lineWidth = pitchLineWidth;
    ctx.globalAlpha = 0.85;

    if (aspectRatio === '9:16') {
      // ── Vertical Pitch (9:16) ──
      // Exactly matches VERTICAL_SVG in pitch-background.tsx (viewBox: -1 -9.722 70 124.444)
      const toNormX = (svgX: number) => ((svgX + 1.0) / 70.0) * 100;
      const toNormY = (svgY: number) => ((svgY + 9.722) / 124.444) * 100;
      const toNormW = (svgW: number) => (svgW / 70.0) * 100;
      const toNormH = (svgH: number) => (svgH / 124.444) * 100;

      // Outer pitch line (68m x 105m)
      ctx.strokeRect(
        snap(toScreenX(toNormX(0))),
        snap(toScreenY(toNormY(0))),
        snap(toScreenSizeX(toNormW(68))),
        snap(toScreenSizeY(toNormH(105))),
      );

      // Center line
      ctx.beginPath();
      ctx.moveTo(snap(toScreenX(toNormX(0))), snap(toScreenY(toNormY(52.5))));
      ctx.lineTo(snap(toScreenX(toNormX(68))), snap(toScreenY(toNormY(52.5))));
      ctx.stroke();

      // Center circle (r=9.15m: 100% mathematical circle on screen)
      const cx = toScreenX(toNormX(34));
      const cy = toScreenY(toNormY(52.5));
      const rX = toScreenSizeX(toNormW(9.15));
      const rY = toScreenSizeY(toNormH(9.15));
      ctx.beginPath();
      ctx.ellipse(snap(cx), snap(cy), snap(rX), snap(rY), 0, 0, Math.PI * 2);
      ctx.stroke();

      // Center spot
      ctx.beginPath();
      ctx.arc(
        snap(cx),
        snap(cy),
        Math.max(2, Math.round(w * 0.005)),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#e2b48d';
      ctx.fill();
      ctx.fillStyle = 'none';

      // Top Penalty Area (13.85, 0, 40.3, 16.5)
      ctx.strokeRect(
        snap(toScreenX(toNormX(13.85))),
        snap(toScreenY(toNormY(0))),
        snap(toScreenSizeX(toNormW(40.3))),
        snap(toScreenSizeY(toNormH(16.5))),
      );

      // Top Goal Area (24.85, 0, 18.3, 5.5)
      ctx.strokeRect(
        snap(toScreenX(toNormX(24.85))),
        snap(toScreenY(toNormY(0))),
        snap(toScreenSizeX(toNormW(18.3))),
        snap(toScreenSizeY(toNormH(5.5))),
      );

      // Top Penalty Spot (34, 11)
      ctx.beginPath();
      ctx.arc(
        snap(toScreenX(toNormX(34))),
        snap(toScreenY(toNormY(11))),
        Math.max(2, Math.round(w * 0.004)),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#e2b48d';
      ctx.fill();
      ctx.fillStyle = 'none';

      // Top Penalty Arc (cx=34, cy=11, r=9.15)
      const arcAngle = Math.acos(5.5 / 9.15); // ~0.925 rad (~53 deg)
      ctx.beginPath();
      ctx.ellipse(
        snap(toScreenX(toNormX(34))),
        snap(toScreenY(toNormY(11))),
        snap(rX),
        snap(rY),
        0,
        Math.PI / 2 - arcAngle,
        Math.PI / 2 + arcAngle,
      );
      ctx.stroke();

      // Bottom Penalty Area (13.85, 88.5, 40.3, 16.5)
      ctx.strokeRect(
        snap(toScreenX(toNormX(13.85))),
        snap(toScreenY(toNormY(88.5))),
        snap(toScreenSizeX(toNormW(40.3))),
        snap(toScreenSizeY(toNormH(16.5))),
      );

      // Bottom Goal Area (24.85, 99.5, 18.3, 5.5)
      ctx.strokeRect(
        snap(toScreenX(toNormX(24.85))),
        snap(toScreenY(toNormY(99.5))),
        snap(toScreenSizeX(toNormW(18.3))),
        snap(toScreenSizeY(toNormH(5.5))),
      );

      // Bottom Penalty Spot (34, 94)
      ctx.beginPath();
      ctx.arc(
        snap(toScreenX(toNormX(34))),
        snap(toScreenY(toNormY(94))),
        Math.max(2, Math.round(w * 0.004)),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#e2b48d';
      ctx.fill();
      ctx.fillStyle = 'none';

      // Bottom Penalty Arc (cx=34, cy=94, r=9.15)
      ctx.beginPath();
      ctx.ellipse(
        snap(toScreenX(toNormX(34))),
        snap(toScreenY(toNormY(94))),
        snap(rX),
        snap(rY),
        0,
        -Math.PI / 2 - arcAngle,
        -Math.PI / 2 + arcAngle,
      );
      ctx.stroke();
    } else {
      // ── Horizontal Pitch (16:9) ──
      // Exactly matches HORIZONTAL_SVG in pitch-background.tsx (viewBox: -9.722 -1 124.444 70)
      const toNormX = (svgX: number) => ((svgX + 9.722) / 124.444) * 100;
      const toNormY = (svgY: number) => ((svgY + 1.0) / 70.0) * 100;
      const toNormW = (svgW: number) => (svgW / 124.444) * 100;
      const toNormH = (svgH: number) => (svgH / 70.0) * 100;

      // Outer pitch line (105m x 68m)
      ctx.strokeRect(
        snap(toScreenX(toNormX(0))),
        snap(toScreenY(toNormY(0))),
        snap(toScreenSizeX(toNormW(105))),
        snap(toScreenSizeY(toNormH(68))),
      );

      // Center line
      ctx.beginPath();
      ctx.moveTo(snap(toScreenX(toNormX(52.5))), snap(toScreenY(toNormY(0))));
      ctx.lineTo(snap(toScreenX(toNormX(52.5))), snap(toScreenY(toNormY(68))));
      ctx.stroke();

      // Center circle (r=9.15m: 100% mathematical circle on screen)
      const cx = toScreenX(toNormX(52.5));
      const cy = toScreenY(toNormY(34));
      const rX = toScreenSizeX(toNormW(9.15));
      const rY = toScreenSizeY(toNormH(9.15));
      ctx.beginPath();
      ctx.ellipse(snap(cx), snap(cy), snap(rX), snap(rY), 0, 0, Math.PI * 2);
      ctx.stroke();

      // Center spot
      ctx.beginPath();
      ctx.arc(
        snap(cx),
        snap(cy),
        Math.max(2, Math.round(w * 0.003)),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#e2b48d';
      ctx.fill();
      ctx.fillStyle = 'none';

      // Left Penalty Area (0, 13.85, 16.5, 40.3)
      ctx.strokeRect(
        snap(toScreenX(toNormX(0))),
        snap(toScreenY(toNormY(13.85))),
        snap(toScreenSizeX(toNormW(16.5))),
        snap(toScreenSizeY(toNormH(40.3))),
      );

      // Left Goal Area (0, 24.85, 5.5, 18.3)
      ctx.strokeRect(
        snap(toScreenX(toNormX(0))),
        snap(toScreenY(toNormY(24.85))),
        snap(toScreenSizeX(toNormW(5.5))),
        snap(toScreenSizeY(toNormH(18.3))),
      );

      // Left Penalty Spot (11, 34)
      ctx.beginPath();
      ctx.arc(
        snap(toScreenX(toNormX(11))),
        snap(toScreenY(toNormY(34))),
        Math.max(2, Math.round(w * 0.003)),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#e2b48d';
      ctx.fill();
      ctx.fillStyle = 'none';

      // Left Penalty Arc (cx=11, cy=34, r=9.15)
      const arcAngle = Math.acos(5.5 / 9.15); // ~0.925 rad (~53 deg)
      ctx.beginPath();
      ctx.ellipse(
        snap(toScreenX(toNormX(11))),
        snap(toScreenY(toNormY(34))),
        snap(rX),
        snap(rY),
        0,
        -arcAngle,
        arcAngle,
      );
      ctx.stroke();

      // Right Penalty Area (88.5, 13.85, 16.5, 40.3)
      ctx.strokeRect(
        snap(toScreenX(toNormX(88.5))),
        snap(toScreenY(toNormY(13.85))),
        snap(toScreenSizeX(toNormW(16.5))),
        snap(toScreenSizeY(toNormH(40.3))),
      );

      // Right Goal Area (99.5, 24.85, 5.5, 18.3)
      ctx.strokeRect(
        snap(toScreenX(toNormX(99.5))),
        snap(toScreenY(toNormY(24.85))),
        snap(toScreenSizeX(toNormW(5.5))),
        snap(toScreenSizeY(toNormH(18.3))),
      );

      // Right Penalty Spot (94, 34)
      ctx.beginPath();
      ctx.arc(
        snap(toScreenX(toNormX(94))),
        snap(toScreenY(toNormY(34))),
        Math.max(2, Math.round(w * 0.003)),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#e2b48d';
      ctx.fill();
      ctx.fillStyle = 'none';

      // Right Penalty Arc (cx=94, cy=34, r=9.15)
      ctx.beginPath();
      ctx.ellipse(
        snap(toScreenX(toNormX(94))),
        snap(toScreenY(toNormY(34))),
        snap(rX),
        snap(rY),
        0,
        Math.PI - arcAngle,
        Math.PI + arcAngle,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  // 2. Interpolated Frame Data
  const frame = getInterpolatedUnifiedSlideFrame(slides, timeMs);

  // 3. Zones (Vertex Morphing)
  Object.values(frame.zones).forEach((z) => {
    if (!z.visible) return;
    ctx.save();
    ctx.fillStyle = z.color || '#22c55e';
    ctx.strokeStyle = z.strokeColor || z.color || '#22c55e';
    ctx.lineWidth = Math.max(
      1.5,
      Math.round((z.strokeWidth || 1.5) * (w / 800)),
    );
    ctx.globalAlpha = z.opacity ?? 0.25;

    if (z.shapeType === 'polygon' && z.points.length > 2) {
      ctx.beginPath();
      ctx.moveTo(
        snap(toScreenX(z.points[0].x)),
        snap(toScreenY(z.points[0].y)),
      );
      for (let i = 1; i < z.points.length; i++) {
        ctx.lineTo(
          snap(toScreenX(z.points[i].x)),
          snap(toScreenY(z.points[i].y)),
        );
      }
      ctx.closePath();
      ctx.fill();
      if (z.strokeWidth && z.strokeWidth > 0) {
        ctx.stroke();
      }
    } else if (z.shapeType === 'rect') {
      const rx = snap(toScreenX(z.x ?? z.points[0]?.x ?? 20));
      const ry = snap(toScreenY(z.y ?? z.points[0]?.y ?? 20));
      const rw = snap(toScreenSizeX(z.width ?? 30));
      const rh = snap(toScreenSizeY(z.height ?? 20));
      ctx.fillRect(rx, ry, rw, rh);
      if (z.strokeWidth && z.strokeWidth > 0) {
        ctx.strokeRect(rx, ry, rw, rh);
      }
    } else if (z.shapeType === 'ellipse') {
      const cx = snap(toScreenX((z.x ?? 20) + (z.width ?? 30) / 2));
      const cy = snap(toScreenY((z.y ?? 20) + (z.height ?? 20) / 2));
      const radX = snap(toScreenSizeX((z.width ?? 30) / 2));
      const radY = snap(toScreenSizeY((z.height ?? 20) / 2));
      ctx.beginPath();
      ctx.ellipse(
        cx,
        cy,
        Math.max(1, radX),
        Math.max(1, radY),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      if (z.strokeWidth && z.strokeWidth > 0) {
        ctx.stroke();
      }
    }
    ctx.restore();
  });

  // 4. Connect Lines between players
  Object.values(frame.players).forEach((p) => {
    if (!p.visible || !p.connectLines || p.connectLines.length === 0) return;
    const px1 = snap(toScreenX(p.x));
    const py1 = snap(toScreenY(p.y));

    p.connectLines.forEach((conn) => {
      if (!conn.visible) return;
      const targetPlayer = frame.players[conn.toPlayerId];
      if (!targetPlayer?.visible) return;

      const px2 = snap(toScreenX(targetPlayer.x));
      const py2 = snap(toScreenY(targetPlayer.y));

      ctx.save();
      ctx.strokeStyle = conn.color || p.style?.color || '#3b82f6';
      ctx.lineWidth = Math.max(
        2,
        Math.round((conn.strokeWidth || 2) * (w / 800)),
      );
      ctx.globalAlpha = Math.min(p.opacity, targetPlayer.opacity) * 0.85;
      if (conn.lineStyle === 'dashed') {
        ctx.setLineDash([8, 5]);
      } else if (conn.lineStyle === 'dotted') {
        ctx.setLineDash([3, 4]);
      }
      ctx.beginPath();
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.stroke();
      ctx.restore();
    });
  });

  // 5. Arrows
  Object.values(frame.arrows).forEach((a) => {
    if (!a.visible || a.points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = a.color || '#38bdf8';
    ctx.fillStyle = a.color || '#38bdf8';
    const arrowWidth = Math.max(
      2,
      Math.round((a.strokeWidth || 3) * (w / 800)),
    );
    ctx.lineWidth = arrowWidth;
    ctx.globalAlpha = a.opacity ?? 1;

    const sx = snap(toScreenX(a.points[0].x));
    const sy = snap(toScreenY(a.points[0].y));
    const ex = snap(toScreenX(a.points[1].x));
    const ey = snap(toScreenY(a.points[1].y));

    if (a.arrowType === 'pass' || a.arrowType === 'defend') {
      ctx.setLineDash([8, 5]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    if (a.curveType === 'curved' && a.controlPoint) {
      const cx = snap(toScreenX(a.controlPoint.x));
      const cy = snap(toScreenY(a.controlPoint.y));
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cx, cy, ex, ey);
      ctx.stroke();
    } else {
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    // Arrowhead
    ctx.setLineDash([]);
    const angle =
      a.curveType === 'curved' && a.controlPoint
        ? Math.atan2(
            ey - snap(toScreenY(a.controlPoint.y)),
            ex - snap(toScreenX(a.controlPoint.x)),
          )
        : Math.atan2(ey - sy, ex - sx);

    const headLen = Math.max(8, Math.round(w * 0.018));
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(
      ex - headLen * Math.cos(angle - Math.PI / 6),
      ey - headLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      ex - headLen * Math.cos(angle + Math.PI / 6),
      ey - headLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();

    // Subtle dark boundary on arrowhead for razor-sharp edge contrast
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = Math.max(1.5, Math.round(w * 0.0015));
    ctx.stroke();

    ctx.restore();
  });

  // 6. Players
  Object.values(frame.players).forEach((p) => {
    if (!p.visible) return;
    const px = snap(toScreenX(p.x));
    const py = snap(toScreenY(p.y));
    const sizeScale = p.style?.sizeScale ?? 1.0;
    const radius = Math.max(8, Math.round(w * 0.022 * sizeScale));

    ctx.save();
    ctx.globalAlpha = p.opacity;

    // Vision Cone
    if (p.visionCone?.visible) {
      const cone = p.visionCone;
      const coneRadius = snap(toScreenSizeX(cone.radius || 20));
      const startAngle = cone.angleRad - cone.spreadRad / 2;
      const endAngle = cone.angleRad + cone.spreadRad / 2;

      ctx.save();
      ctx.globalAlpha = (cone.opacity ?? 0.25) * p.opacity;
      ctx.fillStyle = cone.color || p.style?.color || '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.arc(px, py, coneRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = cone.color || p.style?.color || '#3b82f6';
      ctx.lineWidth = Math.max(1, Math.round(w * 0.0015));
      ctx.stroke();
      ctx.restore();
    }

    // ── 100% Visual Parity with player-layer.tsx ──
    // 1. Player Main Body (Team Color)
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fillStyle =
      p.style?.color || (p.team === 'home' ? '#2563eb' : '#dc2626');
    ctx.fill();

    // 2. Player Standard Stroke (White Ring)
    const strokeWidth = p.style?.strokeWidth ?? 2;
    ctx.lineWidth = Math.max(1.5, Math.round(strokeWidth * (w / 800)));
    ctx.strokeStyle = p.style?.strokeColor || '#ffffff';
    ctx.stroke();

    // 3. Shirt Number (Clean pure white text matching player-layer.tsx without strokeText)
    const showInsideNumber =
      (p.style?.insideContent === 'number' ||
        p.style?.insideContent === undefined) &&
      p.shirtNo;

    if (showInsideNumber && p.shirtNo) {
      const numScale = p.style?.numberSizeScale ?? 1.0;
      const numFontSize = Math.max(8, Math.round(radius * 0.9 * numScale));
      ctx.font = `bold ${numFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(p.shirtNo, px, py);
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

      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Dark background outline (matching stroke="#020617" strokeWidth=1.5 in player-layer.tsx)
      if (typeof ctx.strokeText === 'function') {
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.25));
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(labelText, px, textY);
      }

      // Bright white foreground text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, px, textY);
    }

    ctx.restore();
  });

  // 7. Soccer Ball (Realistic Vector Ball with High-Speed Rendering)
  if (frame.ball.visible) {
    const bx = snap(toScreenX(frame.ball.x));
    const by = snap(toScreenY(frame.ball.y));
    const ballRadius = Math.max(5, Math.round(w * 0.013));

    ctx.save();
    ctx.globalAlpha = frame.ball.opacity;

    // Dark outer contrast ring
    const outerBallRadius = snap(
      ballRadius + Math.max(1.5, Math.round(ballRadius * 0.15)),
    );
    ctx.beginPath();
    ctx.arc(bx, by, outerBallRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#020617';
    ctx.fill();

    // Ball Base (Crisp white leather)
    ctx.beginPath();
    ctx.arc(bx, by, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, Math.round(ballRadius * 0.14));
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Ball Center Pentagons (Realistic football pattern)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(bx, by, snap(ballRadius * 0.38), 0, Math.PI * 2);
    ctx.fill();

    // 3 Radially subtle seam lines
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = Math.max(1, Math.round(ballRadius * 0.1));
    for (let angle = 0; angle < Math.PI * 2; angle += (Math.PI * 2) / 3) {
      ctx.beginPath();
      ctx.moveTo(
        bx + Math.cos(angle) * (ballRadius * 0.38),
        by + Math.sin(angle) * (ballRadius * 0.38),
      );
      ctx.lineTo(
        bx + Math.cos(angle) * (ballRadius * 0.85),
        by + Math.sin(angle) * (ballRadius * 0.85),
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  // 8. Texts (Crisp Outlined Text Rendering)
  Object.values(frame.texts).forEach((t) => {
    if (!t.visible || !t.content) return;
    const tx = snap(toScreenX(t.x));
    const ty = snap(toScreenY(t.y));

    ctx.save();
    ctx.globalAlpha = t.opacity ?? 1;
    const fontStyle = `${t.bold ? 'bold ' : ''}${t.italic ? 'italic ' : ''}`;
    const fontSize = Math.max(12, Math.round((t.fontSize || 16) * (w / 800)));
    ctx.font = `${fontStyle}${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Dark stroke outline for readability (if supported)
    if (typeof ctx.strokeText === 'function') {
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.32));
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(t.content, tx, ty);
    }

    // Foreground text fill
    ctx.fillStyle = t.color || '#ffffff';
    ctx.fillText(t.content, tx, ty);
    ctx.restore();
  });
}
