import type { InterpolatedTextState } from '@/lib/tactical/unified-interpolation';
import {
  type FrameRenderContext,
  TACTICAL_CANVAS_FONT_FAMILY,
} from './renderer-context';

/**
 * Draws crisp outlined tactical texts onto canvas context.
 */
export function renderTexts(
  context: FrameRenderContext,
  texts: Record<string, InterpolatedTextState>,
): void {
  const { ctx, w, projectObjToScreen, snap } = context;

  Object.values(texts).forEach((t) => {
    if (!t.visible || !t.content) return;
    const _tp = projectObjToScreen(t.x, t.y);
    const tx = snap(_tp.x);
    const ty = snap(_tp.y);

    ctx.save();
    ctx.globalAlpha = t.opacity ?? 1;
    const fontStyle = `${t.bold ? 'bold ' : ''}${t.italic ? 'italic ' : ''}`;
    const fontSize = Math.max(12, Math.round((t.fontSize || 16) * (w / 800)));
    ctx.font = `${fontStyle}${fontSize}px ${TACTICAL_CANVAS_FONT_FAMILY}`;
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
