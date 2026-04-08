import React from 'react';
import { 
  MousePointer2, 
  Square, 
  Circle, 
  ArrowUpRight, 
  Minus, 
  Highlighter, 
  Sun, 
  Link2 
} from 'lucide-react';
import { useEditorStore, ToolType } from '../../../stores/useEditorStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TOOLS: { id: ToolType; icon: any; title: string }[] = [
  { id: 'rect', icon: Square, title: 'Rectangle (R)' },
  { id: 'circle', icon: Circle, title: 'Ellipse (O)' },
  { id: 'arrow', icon: ArrowUpRight, title: 'Arrow (A)' },
  { id: 'line', icon: Minus, title: 'Line (L)' },
  { id: 'highlight', icon: Highlighter, title: 'Highlight (H)' },
  { id: 'spotlight', icon: Sun, title: 'Spotlight (S)' },
  { id: 'connector', icon: Link2, title: 'Connector (C)' },
];

export const Toolbar: React.FC = () => {
  const { activeTool, setTool } = useEditorStore();

  return (
    <div className="flex flex-row gap-2 p-2 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        
        return (
          <button
            key={tool.id}
            onClick={() => setTool(tool.id)}
            title={tool.title}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
              isActive 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-500/50" 
                : "text-neutral-500 hover:bg-white/5 hover:text-neutral-200"
            )}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
          </button>
        );
      })}
    </div>
  );
};
