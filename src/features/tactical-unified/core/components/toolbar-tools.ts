import {
  ArrowRight,
  CircleDot,
  Eraser,
  Minus,
  MousePointer,
  Pentagon,
  Route,
  Square,
  Type,
  User,
  Waves,
} from 'lucide-react';
import type React from 'react';
import type { DrawingTool } from '../types';
import { DashedArrowIcon } from './hud/hud-icons';

export const PALETTE = [
  { label: 'Red', value: '#ef4444' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green', value: '#10b981' },
  { label: 'White', value: '#ffffff' },
];

export interface ToolDefinition {
  tool: DrawingTool;
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  markerCondition?: 'not-2d-only' | 'not-3d-only';
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  { tool: 'select', title: 'Select (V)', icon: MousePointer },
  { tool: 'line', title: 'Straight Line', icon: Minus },
  { tool: 'route_line', title: 'Route Line', icon: Route },
  { tool: 'arrow_solid', title: 'Solid Arrow', icon: ArrowRight },
  { tool: 'arrow_dash', title: 'Dashed Arrow', icon: DashedArrowIcon },
  { tool: 'arrow_wavy', title: 'Wavy Arrow', icon: Waves },
  { tool: 'zone', title: 'Zone', icon: Square },
  { tool: 'polygon_zone', title: 'Polygon Zone', icon: Pentagon },
  { tool: 'text', title: 'Text (T)', icon: Type },
  {
    tool: 'player',
    title: '2D Player Marker',
    icon: User,
    markerCondition: 'not-3d-only',
  },
  {
    tool: 'player-ring',
    title: '3D Player Ring Marker',
    icon: CircleDot,
    markerCondition: 'not-2d-only',
  },
  { tool: 'eraser', title: 'Eraser (E)', icon: Eraser },
];
