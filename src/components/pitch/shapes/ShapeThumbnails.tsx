import type { FieldShapeOptions } from '../types';
import React from 'react';
import { RectThumbnail } from './rect';
import { TiltedThumbnail } from './tilted';
import { DeepThumbnail } from './deep';

const shapeThumbnails: Record<
  FieldShapeOptions,
  { label: string; thumbnail: React.ReactNode }
> = {
  rect: {
    label: 'Rect',
    thumbnail: (
      <RectThumbnail strokeColor="#06b6d4" backgroundColor="#1e293b" />
    ),
  },
  tilted: {
    label: 'Tilted',
    thumbnail: (
      <TiltedThumbnail strokeColor="#06b6d4" backgroundColor="#1e293b" />
    ),
  },
  deep: {
    label: 'Deep',
    thumbnail: (
      <DeepThumbnail strokeColor="#06b6d4" backgroundColor="#1e293b" />
    ),
  },
};

export function getShapeThumbnail(key: FieldShapeOptions): React.ReactNode {
  return shapeThumbnails[key].thumbnail;
}
