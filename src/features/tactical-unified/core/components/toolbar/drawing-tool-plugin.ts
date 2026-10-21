import { MousePointer, MoveRight, Square, Type } from 'lucide-react';
import type React from 'react';
import type { DrawingTool } from '@/lib/types/tactical-unified';
import {
  CircleMarkerIcon,
  CustomPolygonZoneIcon,
  DashedArrowIcon,
  RingMarkerIcon,
  RouteLineIcon,
  StraightLineIcon,
  WavyArrowIcon,
} from './core-toolbar-icons';

export interface DrawingToolPlugin {
  id: DrawingTool;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const DRAWING_TOOLS_CORE: DrawingToolPlugin[] = [
  { id: 'select', label: 'Select (V)', icon: MousePointer },
  { id: 'line', label: 'Straight Line (L)', icon: StraightLineIcon },
  { id: 'route_line', label: 'Route Line (R)', icon: RouteLineIcon },
  { id: 'arrow_solid', label: 'Solid Arrow (A)', icon: MoveRight },
  { id: 'arrow_dash', label: 'Dashed Arrow (D)', icon: DashedArrowIcon },
  { id: 'arrow_wavy', label: 'Wavy Arrow (W)', icon: WavyArrowIcon },
  { id: 'zone', label: 'Zone (Z)', icon: Square },
  {
    id: 'polygon_zone',
    label: 'Polygon Zone (P)',
    icon: CustomPolygonZoneIcon,
  },
  { id: 'text', label: 'Text (T)', icon: Type },
];

export const TOOL_PLUGIN_PLAYER_2D: DrawingToolPlugin = {
  id: 'player',
  label: '2D Player Marker (M)',
  icon: CircleMarkerIcon,
};

export const TOOL_PLUGIN_PLAYER_3D_RING: DrawingToolPlugin = {
  id: 'player-ring',
  label: '3D Foot Ring (O)',
  icon: RingMarkerIcon,
};

export const EXTENSION_DRAWING_TOOLS: DrawingToolPlugin[] = [
  ...DRAWING_TOOLS_CORE,
  TOOL_PLUGIN_PLAYER_3D_RING,
];

export const WEB_DRAWING_TOOLS: DrawingToolPlugin[] = [
  ...DRAWING_TOOLS_CORE,
  TOOL_PLUGIN_PLAYER_2D,
];

export function getDrawingTools(
  markerMode: '2d-only' | '3d-only' | 'all' = '2d-only',
): DrawingToolPlugin[] {
  if (markerMode === '3d-only') {
    return [...DRAWING_TOOLS_CORE, TOOL_PLUGIN_PLAYER_3D_RING];
  }
  if (markerMode === 'all') {
    return [
      ...DRAWING_TOOLS_CORE,
      TOOL_PLUGIN_PLAYER_2D,
      TOOL_PLUGIN_PLAYER_3D_RING,
    ];
  }
  return [...DRAWING_TOOLS_CORE, TOOL_PLUGIN_PLAYER_2D];
}
