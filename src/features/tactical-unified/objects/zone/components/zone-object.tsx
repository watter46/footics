'use client';

/**
 * zone-object.tsx
 * 四角形・円形・多角形フリーゾーンの描画（Konva構造ルール準拠・責務分離）
 */

import React from 'react';
import type { ZoneObjectProps } from '../types';
import { ZonePolygonNode } from './zone-polygon-node';
import { ZoneShapeNode } from './zone-shape-node';

export type { ZoneObjectProps } from '../types';

export const ZoneObject = React.memo(function ZoneObject(
  props: ZoneObjectProps,
) {
  if (props.zone.shapeType === 'polygon') {
    return <ZonePolygonNode {...props} />;
  }

  return <ZoneShapeNode {...props} />;
});
