/**
 * drawing-tool-config.ts
 * Tool list definition derived from drawing tool registry
 */

import type React from 'react';
import { getDrawingTools } from '@/features/tactical-unified/core/components/toolbar';
import type { DrawingTool } from '@/lib/types/tactical-unified';

export const PRIMARY_TOOLS: {
  tool: DrawingTool;
  icon: React.ElementType;
  label: string;
}[] = getDrawingTools('all').map((plugin) => ({
  tool: plugin.id,
  icon: plugin.icon,
  label: plugin.label,
}));
