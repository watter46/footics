'use client';

import { IconButton } from '@/components/ui/icon-button';
import { useSessionStore } from '@/features/tactical-unified/stores/tactical-store-provider';
import type { DrawingToolPlugin } from './drawing-tool-plugin';

export interface ToolbarToolsGroupProps {
  tools: DrawingToolPlugin[];
}

export function ToolbarToolsGroup({ tools }: ToolbarToolsGroupProps) {
  const activeTool = useSessionStore((s) => s.activeTool);
  const setActiveTool = useSessionStore((s) => s.setActiveTool);

  return (
    <>
      {tools.map(({ id, icon: Icon, label }) => {
        const isActive = activeTool === id;
        return (
          <IconButton
            key={id}
            data-tool={id}
            data-testid={`tool-${id}`}
            onClick={() => setActiveTool(id)}
            title={label}
            aria-label={label}
            isActive={isActive}
            variant="ghost"
            size="sm"
            className="shrink-0"
          >
            <Icon size={16} />
          </IconButton>
        );
      })}
    </>
  );
}
