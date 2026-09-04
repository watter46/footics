/**
 * drawing-tool-config.ts
 * Static tool list definition for DrawingToolbar
 */

import type React from 'react';
import { MousePointer, MoveRight, Square, Type } from 'lucide-react';
import type { DrawingTool } from '@/lib/types/tactical-unified';
import {
  CustomPolygonZoneIcon,
  DashedArrowIcon,
  RingMarkerIcon,
  RouteLineIcon,
  StraightLineIcon,
  WavyArrowIcon,
} from './drawing-toolbar-icons';

export const PRIMARY_TOOLS: {
  tool: DrawingTool;
  icon: React.ElementType;
  label: string;
}[] = [
  { tool: 'select', icon: MousePointer, label: 'Select (V)' },
  { tool: 'line', icon: StraightLineIcon, label: 'Straight Line (L)' },
  { tool: 'route_line', icon: RouteLineIcon, label: 'Route Line (R)' },
  { tool: 'arrow_solid', icon: MoveRight, label: 'Solid Arrow (A)' },
  { tool: 'arrow_dash', icon: DashedArrowIcon, label: 'Dashed Arrow (D)' },
  {
    tool: 'arrow_wavy',
    icon: WavyArrowIcon,
    label: 'Wavy Arrow / Dribble (W)',
  },
  { tool: 'zone_circle', icon: Square, label: 'Zone (Z)' },
  {
    tool: 'polygon_zone',
    icon: CustomPolygonZoneIcon,
    label: 'Free Zone (P)',
  },
  { tool: 'text', icon: Type, label: 'Text (T)' },
  { tool: 'player-ring', icon: RingMarkerIcon, label: '3D Foot Ring (O)' },
];
