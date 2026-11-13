import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  DomainBallState,
  DomainTextAnnotation,
} from '@/lib/types/tactical/domain-entities';

export { normalizeArrows } from './arrow-normalizer';
export { normalizeZones } from './zone-normalizer';

export function normalizeTexts(rawTexts: unknown): DomainTextAnnotation[] {
  if (!Array.isArray(rawTexts)) return [];

  const texts: DomainTextAnnotation[] = [];
  for (const raw of rawTexts) {
    if (!raw || typeof raw !== 'object') continue;
    const t = raw as Record<string, unknown>;

    const id = typeof t.id === 'string' && t.id ? t.id : crypto.randomUUID();
    const x = clampToScreenNorm(typeof t.x === 'number' ? t.x : 50);
    const y = clampToScreenNorm(typeof t.y === 'number' ? t.y : 50);
    const content = typeof t.content === 'string' ? t.content : '';
    const fontSize =
      typeof t.fontSize === 'number'
        ? Math.max(8, Math.min(72, t.fontSize))
        : 16;
    const color =
      typeof t.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(t.color)
        ? t.color
        : '#ffffff';
    const bold = typeof t.bold === 'boolean' ? t.bold : false;
    const italic = typeof t.italic === 'boolean' ? t.italic : false;
    const locked = typeof t.locked === 'boolean' ? t.locked : undefined;

    texts.push({
      id,
      annotationType: 'text',
      x,
      y,
      content,
      fontSize,
      color,
      bold,
      italic,
      locked,
    });
  }

  return texts;
}

export function normalizeBall(rawBall: unknown): DomainBallState {
  if (!rawBall || typeof rawBall !== 'object') {
    return {
      x: clampToScreenNorm(50),
      y: clampToScreenNorm(50),
      visible: true,
    };
  }

  const b = rawBall as Record<string, unknown>;
  return {
    x: clampToScreenNorm(typeof b.x === 'number' ? b.x : 50),
    y: clampToScreenNorm(typeof b.y === 'number' ? b.y : 50),
    visible: typeof b.visible === 'boolean' ? b.visible : true,
    color: typeof b.color === 'string' ? b.color : undefined,
    sizeScale:
      typeof b.sizeScale === 'number'
        ? Math.max(0.4, Math.min(2.0, b.sizeScale))
        : undefined,
    locked: typeof b.locked === 'boolean' ? b.locked : undefined,
    trajectory:
      b.trajectory && typeof b.trajectory === 'object'
        ? (b.trajectory as DomainBallState['trajectory'])
        : undefined,
  };
}
