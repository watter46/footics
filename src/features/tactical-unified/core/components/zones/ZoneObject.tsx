'use client';

import React from 'react';
import type { ZoneNodeProps } from './ZonePolygonNode';
import { ZonePolygonNode } from './ZonePolygonNode';
import { ZoneShapeNode } from './ZoneShapeNode';

export type { ZoneNodeProps as ZoneObjectProps };

export const ZoneObject = React.memo(function ZoneObject(props: ZoneNodeProps) {
  if (props.zone.shapeType === 'polygon') {
    return <ZonePolygonNode {...props} />;
  }

  return <ZoneShapeNode {...props} />;
});
