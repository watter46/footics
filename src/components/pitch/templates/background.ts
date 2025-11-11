/**
 * フィールド定義
 * 単色・グラデーション・縦横ストライプのみを管理
 */

import type {
  FieldBackgroundOptions,
  FieldBackgroundOptionsMap,
  GradientDirection,
  PatternKey,
} from '../template-types';
import { getVerticalStripeSVG } from './vertical/vertical-stripe-svg';
import { getHorizontalStripeSVG } from './horizontal/horizontal-stripe-svg';
import { getGridStripeSVG } from './grid/grid-stripe-svg';
import { getDiagonalStripeSVG } from './diagonal-stripe/diagonal-stripe-svg';
import { getGeometricPatternSVG } from './geometric/geometric-pattern-svg';
import type { CSSProperties } from 'react';
import { generateGridDiagonalPatternSVG } from './grid-diagonal/grid-diagonal-svg';
import { generatePolygonTileSVG } from './polygon-tile/polygon-tile-svg';

const generatePatternUrl = (svgData: string) => {
  return `url("data:image/svg+xml,${encodeURIComponent(svgData)}")`;
};

export const defaultFieldBackgroundSettings: FieldBackgroundOptionsMap = {
  solid: {
    key: 'solid',
    label: 'Solid',
    color: '#060e37',
    opacity: 1,
  },
  gradient: {
    key: 'gradient',
    label: 'Gradient',
    gradientType: 'linear',
    direction: 'to-b',
    fromColor: '#0e0a42',
    toColor: '#12309b',
  },
  verticalStripe: {
    key: 'verticalStripe',
    label: 'Vertical',
    baseColor: '#0b072c',
    patternColor: '#261a7f',
    patternOpacity: 0.4,
  },
  horizontalStripe: {
    key: 'horizontalStripe',
    label: 'Horizontal',
    baseColor: '#0b072c',
    patternColor: '#261a7f',
    patternOpacity: 0.4,
  },
  grid: {
    key: 'grid',
    label: 'Grid',
    baseColor: '#0b072c',
    patternColor: '#261a7f',
    patternOpacity: 0.4,
  },
  diagonalStripe: {
    key: 'diagonalStripe',
    label: 'Diagonal',
    baseColor: '#0b072c',
    patternColor: '#261a7f',
    patternOpacity: 0.4,
  },
  geometric: {
    key: 'geometric',
    label: 'Geometric',
    baseColor: '#0b072c',
    patternColor: '#261a7f',
    patternOpacity: 0.4,
  },
  gridDiagonal: {
    key: 'gridDiagonal',
    label: 'GridDiagonal',
    baseColor: '#0b072c',
    patternColor: '#442eea',
    patternOpacity: 0.4,
  },
  polygonTile: {
    key: 'polygonTile',
    label: 'PolygonTile',
    baseColor: '#0b072c',
    patternColor: '#261a7f',
    patternOpacity: 0.4,
  },
};

export function getFieldBackgroundOption<K extends PatternKey>(
  key: K,
  overrides?: Partial<FieldBackgroundOptionsMap[K]>
): FieldBackgroundOptionsMap[K] {
  return { ...defaultFieldBackgroundSettings[key], ...overrides };
}

export const getFieldBackgroundStyle = (
  background: FieldBackgroundOptions
): CSSProperties => {
  if (background.key === 'solid') {
    return {
      backgroundColor: background.color,
      opacity: background.opacity,
    };
  }

  if (background.key === 'gradient') {
    const fromColor = background.fromColor;
    const toColor = background.toColor;
    const gradientType = background.gradientType;
    const gradientDirection = background.direction;

    function convertGradientDirection(direction: GradientDirection): string {
      const directionMap: Record<GradientDirection, string> = {
        'to-br': '135deg',
        'to-tr': '45deg',
        'to-r': '90deg',
        'to-l': '270deg',
        'to-b': '180deg',
        'to-t': '0deg',
      };
      return directionMap[direction] || '135deg';
    }

    return {
      background:
        gradientType === 'radial'
          ? `radial-gradient(circle, ${fromColor}, ${toColor})`
          : `linear-gradient(${convertGradientDirection(
              gradientDirection || 'to-br'
            )}, ${fromColor}, ${toColor})`,
    };
  }

  if (background.key === 'verticalStripe') {
    const baseColor = background.baseColor;
    const patternColor = background.patternColor;
    const patternOpacity = background.patternOpacity;

    const svgData = getVerticalStripeSVG(patternColor, patternOpacity);

    return {
      backgroundColor: baseColor,
      backgroundImage: generatePatternUrl(svgData),
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
    };
  }

  if (background.key === 'horizontalStripe') {
    const baseColor = background.baseColor;
    const patternColor = background.patternColor;
    const patternOpacity = background.patternOpacity;

    const svgData = getHorizontalStripeSVG(patternColor, patternOpacity);

    return {
      backgroundColor: baseColor,
      backgroundImage: generatePatternUrl(svgData),
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
    };
  }

  if (background.key === 'grid') {
    const baseColor = background.baseColor;
    const patternColor = background.patternColor;
    const patternOpacity = background.patternOpacity;

    const svgData = getGridStripeSVG(patternColor, patternOpacity);

    return {
      backgroundColor: baseColor,
      backgroundImage: generatePatternUrl(svgData),
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
    };
  }

  if (background.key === 'diagonalStripe') {
    const baseColor = background.baseColor;
    const patternColor = background.patternColor;
    const patternOpacity = background.patternOpacity;

    const svgData = getDiagonalStripeSVG(patternColor, patternOpacity);

    return {
      backgroundColor: baseColor,
      backgroundImage: generatePatternUrl(svgData),
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
    };
  }

  if (background.key === 'geometric') {
    const baseColor = background.baseColor;
    const patternColor = background.patternColor;
    const patternOpacity = background.patternOpacity;

    const svgData = getGeometricPatternSVG(patternColor, patternOpacity);

    return {
      backgroundColor: baseColor,
      backgroundImage: generatePatternUrl(svgData),
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
    };
  }

  if (background.key === 'gridDiagonal') {
    const baseColor = background.baseColor;
    const patternColor = background.patternColor;
    const patternOpacity = background.patternOpacity;
    const svgData = generateGridDiagonalPatternSVG({
      color: patternColor,
      opacity: patternOpacity,
    });
    return {
      backgroundColor: baseColor,
      backgroundImage: generatePatternUrl(svgData),
      backgroundSize: '40%',
      backgroundRepeat: 'repeat',
    };
  }

  if (background.key === 'polygonTile') {
    const baseColor = background.baseColor;
    const patternColor = background.patternColor;
    const patternOpacity = background.patternOpacity;
    const svgData = generatePolygonTileSVG({
      color: patternColor,
      opacity: patternOpacity,
    });
    return {
      backgroundColor: baseColor,
      backgroundImage: generatePatternUrl(svgData),
      backgroundSize: '40%',
      backgroundRepeat: 'repeat',
    };
  }

  return {};
};
