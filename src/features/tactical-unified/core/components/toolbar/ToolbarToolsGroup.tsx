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
                ? 'bg-[#0d99ff] text-white shadow-xs'
                : 'text-white/80 hover:text-white hover:bg-[#333333]'
            }`}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </>
  );
}
