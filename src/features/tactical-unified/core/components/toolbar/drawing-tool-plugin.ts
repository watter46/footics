import { Eraser, MousePointer, MoveRight, Square, Type } from 'lucide-react';
import type React from 'react';
import type { DrawingTool } from '@/lib/types/tactical-unified';
import {
  CircleMarkerIcon,
  CustomPolygonZoneIcon,
  DashedArrowIcon,
  RingFadeMarkerIcon,
  RingMarkerIcon,
  RouteLineIcon,
  StraightLineIcon,
  WavyArrowIcon,
} from './core-toolbar-icons';

export type ToolVisibility =
  | 'core'
  | '2d-marker'
  | '3d-marker'
  | 'shortcut-only';

export interface DrawingToolPlugin {
  id: DrawingTool;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  shortcutKey?: string;
  visibility?: ToolVisibility;
}

export const DRAWING_TOOLS_CORE: DrawingToolPlugin[] = [
  {
    id: 'select',
    label: 'Select (V)',
    icon: MousePointer,
    shortcutKey: 'v',
    visibility: 'core',
  },
  {
    id: 'line',
    label: 'Straight Line (L)',
    icon: StraightLineIcon,
    shortcutKey: 'l',
    visibility: 'core',
  },
  {
    id: 'route_line',
    label: 'Route Line (R)',
    icon: RouteLineIcon,
    shortcutKey: 'r',
    visibility: 'core',
  },
  {
    id: 'arrow_solid',
    label: 'Solid Arrow (A)',
    icon: MoveRight,
    shortcutKey: 'a',
    visibility: 'core',
  },
  {
    id: 'arrow_dash',
    label: 'Dashed Arrow (D)',
    icon: DashedArrowIcon,
    shortcutKey: 'd',
    visibility: 'core',
  },
  {
    id: 'arrow_wavy',
    label: 'Wavy Arrow (W)',
    icon: WavyArrowIcon,
    shortcutKey: 'w',
    visibility: 'core',
  },
  {
    id: 'zone',
    label: 'Zone (Z)',
    icon: Square,
    visibility: 'core',
  },
  {
    id: 'polygon_zone',
    label: 'Polygon Zone (P)',
    icon: CustomPolygonZoneIcon,
    shortcutKey: 'p',
    visibility: 'core',
  },
  {
    id: 'text',
    label: 'Text (T)',
    icon: Type,
    shortcutKey: 't',
    visibility: 'core',
  },
];

export const TOOL_PLUGIN_PLAYER_2D: DrawingToolPlugin = {
  id: 'player',
  label: '2D Player Marker (M)',
  icon: CircleMarkerIcon,
  shortcutKey: 'm',
  visibility: '2d-marker',
};

export const TOOL_PLUGIN_PLAYER_3D_RING: DrawingToolPlugin = {
  id: 'player-ring',
  label: '3D Foot Ring (O)',
  icon: RingMarkerIcon,
  shortcutKey: 'o',
  visibility: '3d-marker',
};

export const TOOL_PLUGIN_PLAYER_3D_RING_FADE: DrawingToolPlugin = {
  id: 'player-ring-fade',
  label: '3D Fade Ring (F)',
  icon: RingFadeMarkerIcon,
  visibility: '3d-marker',
};

export const TOOL_PLUGIN_ERASER: DrawingToolPlugin = {
  id: 'eraser',
  label: 'Eraser (E)',
  icon: Eraser,
  shortcutKey: 'e',
  visibility: 'shortcut-only',
};

export const TOOL_PLUGIN_ZONE_CIRCLE: DrawingToolPlugin = {
  id: 'zone_circle',
  label: 'Zone Circle (Z)',
  icon: Square,
  shortcutKey: 'z',
  visibility: 'shortcut-only',
};

export const drawingToolPlugins = new Map<string, DrawingToolPlugin>();

export function registerDrawingToolPlugin(plugin: DrawingToolPlugin): void {
  drawingToolPlugins.set(plugin.id, plugin);
}

const INITIAL_PLUGINS: DrawingToolPlugin[] = [
  ...DRAWING_TOOLS_CORE,
  TOOL_PLUGIN_PLAYER_2D,
  TOOL_PLUGIN_PLAYER_3D_RING,
  TOOL_PLUGIN_PLAYER_3D_RING_FADE,
  TOOL_PLUGIN_ERASER,
  TOOL_PLUGIN_ZONE_CIRCLE,
];

for (const plugin of INITIAL_PLUGINS) {
  registerDrawingToolPlugin(plugin);
}

export function getToolShortcutMap(): Record<string, DrawingTool> {
  const map: Record<string, DrawingTool> = {};
  for (const plugin of drawingToolPlugins.values()) {
    if (plugin.shortcutKey) {
      map[plugin.shortcutKey.toLowerCase()] = plugin.id;
    }
  }
  return map;
}

export function getDrawingTools(
  markerMode: '2d-only' | '3d-only' | 'all' = '2d-only',
): DrawingToolPlugin[] {
  const tools: DrawingToolPlugin[] = [];
  for (const plugin of drawingToolPlugins.values()) {
    if (plugin.visibility === 'shortcut-only') {
      continue;
    }
    if (markerMode === '2d-only' && plugin.visibility === 'core') {
      tools.push(plugin);
    } else if (
      markerMode === '3d-only' &&
      (plugin.visibility === 'core' || plugin.visibility === '3d-marker')
    ) {
      tools.push(plugin);
    } else if (
      markerMode === 'all' &&
      (plugin.visibility === 'core' ||
        plugin.visibility === '2d-marker' ||
        plugin.visibility === '3d-marker')
    ) {
      tools.push(plugin);
    }
  }
  return tools;
}

export const EXTENSION_DRAWING_TOOLS: DrawingToolPlugin[] = [
  ...DRAWING_TOOLS_CORE,
  TOOL_PLUGIN_PLAYER_3D_RING,
  TOOL_PLUGIN_PLAYER_3D_RING_FADE,
];

export const WEB_DRAWING_TOOLS: DrawingToolPlugin[] = [...DRAWING_TOOLS_CORE];
