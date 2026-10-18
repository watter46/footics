'use client';

import { useCanvasStore } from '../../hooks/use-canvas-store';
import type { DrawingToolPlugin } from './drawing-tool-plugin';

export interface ToolbarToolsGroupProps {
  tools: DrawingToolPlugin[];
}

export function ToolbarToolsGroup({ tools }: ToolbarToolsGroupProps) {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);

  return (
    <>
      {tools.map(({ id, icon: Icon, label }) => {
        const isActive = activeTool === id;
        return (
          <button
            type="button"
            key={id}
            data-tool={id}
            data-testid={`tool-${id}`}
            onClick={() => setActiveTool(id)}
            title={label}
            aria-label={label}
            className={`p-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
              isActive
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-400'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </>
  );
}
