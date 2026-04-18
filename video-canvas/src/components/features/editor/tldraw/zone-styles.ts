import { getDefaultColorTheme } from 'tldraw';

/**
 * Resolve a tldraw color style ID (e.g. 'red', 'blue') to an actual CSS color
 * string using the current theme.
 */
export function resolveColor(colorId: string, isDarkMode: boolean): string {
  const theme = getDefaultColorTheme({ isDarkMode });
  const colorValue = theme[colorId as keyof typeof theme];
  return typeof colorValue === 'string'
    ? colorValue
    : ((colorValue as any)?.solid ?? colorId);
}

/**
 * Compute SVG fill + opacity from a tldraw fill style value.
 */
export function resolveFill(
  fillStyle: string,
  color: string,
): { fill: string; fillOpacity: number } {
  switch (fillStyle) {
    case 'solid':
      return { fill: color, fillOpacity: 1 };
    case 'semi':
      return { fill: color, fillOpacity: 0.2 };
    case 'pattern':
      return { fill: color, fillOpacity: 0.05 };
    default:
      return { fill: 'none', fillOpacity: 1 };
  }
}

/**
 * Compute SVG stroke-dasharray from a tldraw dash style value.
 */
export function resolveDash(dashStyle: string): string {
  switch (dashStyle) {
    case 'dashed':
      return '8 8';
    case 'dotted':
      return '2 6';
    default:
      return '0';
  }
}

/** Shared default stroke width for all Zone shapes. */
export const ZONE_STROKE_WIDTH = 4;

/** Shared default props for all Zone shapes. */
export const ZONE_DEFAULT_PROPS = {
  w: 100,
  h: 100,
  color: 'red' as const,
  fill: 'semi' as const,
  dash: 'draw' as const,
};
