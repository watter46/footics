import type { PatternKey } from '../template-types';
import type { ReactNode } from 'react';
import { SolidThumbnail } from './solid';
import { GradientThumbnail } from './gradient';
import { VerticalThumbnail } from './vertical';
import { HorizontalThumbnail } from './horizontal';
import { GridThumbnail } from './grid/GridThumbnail';
import { DiagonalStripeThumbnail } from './diagonal-stripe/DiagonalStripeThumbnail';
import { GeometricThumbnail } from './geometric/GeometricThumbnail';
import { GridDiagonalThumbnail } from './grid-diagonal/GridDiagonalThumbnail';
import { PolygonTileThumbnail } from './polygon-tile/PolygonTileThumbnail';

/**
 * 共通ベース型
 */
export type TemplateThumbnailBase = {
  key: PatternKey;
  label: string;
  thumbnail: ReactNode;
};

export const templateThumbnails: Record<PatternKey, TemplateThumbnailBase> = {
  solid: {
    key: 'solid',
    label: 'Solid',
    thumbnail: <SolidThumbnail color="#060e37" />,
  },
  gradient: {
    key: 'gradient',
    label: 'Gradient',
    thumbnail: <GradientThumbnail fromColor="#0e0a42" toColor="#615306ff" />,
  },
  verticalStripe: {
    key: 'verticalStripe',
    label: 'Vertical',
    thumbnail: <VerticalThumbnail color="#0b072c" patternColor="#b39a10" />,
  },
  horizontalStripe: {
    key: 'horizontalStripe',
    label: 'Horizontal',
    thumbnail: <HorizontalThumbnail color="#0b072c" patternColor="#b39a10" />,
  },
  grid: {
    key: 'grid',
    label: 'Grid',
    thumbnail: (
      <GridThumbnail
        baseColor="#0b072c"
        patternColor="#b39a10"
        patternOpacity={1}
      />
    ),
  },
  diagonalStripe: {
    key: 'diagonalStripe',
    label: 'Diagonal',
    thumbnail: (
      <DiagonalStripeThumbnail
        baseColor="#0b072c"
        patternColor="#b39a10"
        patternOpacity={1}
      />
    ),
  },
  geometric: {
    key: 'geometric',
    label: 'Geometric',
    thumbnail: (
      <GeometricThumbnail
        baseColor="#0b072c"
        patternColor="#fdf8b4"
        patternOpacity={1}
      />
    ),
  },
  gridDiagonal: {
    key: 'gridDiagonal',
    label: 'GridDiagonal',
    thumbnail: <GridDiagonalThumbnail color="#b39a10" />,
  },
  polygonTile: {
    key: 'polygonTile',
    label: 'PolygonTile',
    thumbnail: <PolygonTileThumbnail color="#b39a10" />,
  },
};

export function getTemplateThumbnail(key: PatternKey): ReactNode {
  return templateThumbnails[key].thumbnail;
}
