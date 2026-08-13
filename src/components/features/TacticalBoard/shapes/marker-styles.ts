import { getDefaultColorTheme } from 'tldraw';

export const ZONE_STROKE_WIDTH = 4;

export const ZONE_DEFAULT_PROPS = {
  w: 100,
  h: 100,
  color: 'red' as const,
  fill: 'semi' as const,
  dash: 'draw' as const,
};

export function resolveColor(colorId: string, isDarkMode: boolean): string {
  const theme = getDefaultColorTheme({ isDarkMode });
  const colorValue = theme[colorId as keyof typeof theme];
  if (typeof colorValue === 'string') return colorValue;
  if (
    colorValue &&
    typeof colorValue === 'object' &&
    'solid' in colorValue &&
    typeof (colorValue as { solid?: string }).solid === 'string'
  ) {
    return (colorValue as { solid: string }).solid;
  }
  return colorId;
}

export function resolveFill(
  fillStyle: string,
  color: string,
): { fill: string; fillOpacity: number } {
  switch (fillStyle) {
    case 'solid':
      return { fill: color, fillOpacity: 1 };
    case 'semi':
      return { fill: color, fillOpacity: 0.25 };
    case 'pattern':
      return { fill: color, fillOpacity: 0.05 };
    default:
      return { fill: 'none', fillOpacity: 1 };
  }
}

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
