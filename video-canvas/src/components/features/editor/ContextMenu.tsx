import React, { useEffect } from 'react';
import { useEditorStore } from '../../../stores/useEditorStore';
import { 
  ArrowUp, 
  ArrowDown, 
  ChevronUp, 
  ChevronDown, 
  Trash2,
  Copy,
  Lock,
  Unlock
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ContextMenuProps {
  x: number;
  y: number;
  targetId: string | null;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, targetId, onClose }) => {
  const { 
    bringToFront, 
    sendToBack, 
    bringForward, 
    sendBackward, 
    removeObject,
    updateObject,
    objects 
  } = useEditorStore();

  const targetObject = objects.find(o => o.id === targetId);

  useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  if (!targetId || !targetObject) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div 
      className="fixed z-[1000] bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-xl py-1.5 shadow-2xl min-w-[180px] animate-in fade-in zoom-in duration-100"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1 mb-1 border-b border-white/5">
        <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider truncate">
          {targetObject.name || `${targetObject.type}`}
        </div>
      </div>

      <ContextMenuItem 
        icon={<ArrowUp size={14} />} 
        label="Bring to Front" 
        shortcut="]"
        onClick={() => handleAction(() => bringToFront(targetId))} 
      />
      <ContextMenuItem 
        icon={<ChevronUp size={14} />} 
        label="Bring Forward" 
        shortcut="Ctrl+]"
        onClick={() => handleAction(() => bringForward(targetId))} 
      />
      <ContextMenuItem 
        icon={<ChevronDown size={14} />} 
        label="Send Backward" 
        shortcut="Ctrl+["
        onClick={() => handleAction(() => sendBackward(targetId))} 
      />
      <ContextMenuItem 
        icon={<ArrowDown size={14} />} 
        label="Send to Back" 
        shortcut="["
        onClick={() => handleAction(() => sendToBack(targetId))} 
      />

      <div className="h-px bg-white/5 my-1.5" />

      <ContextMenuItem 
        icon={targetObject.locked ? <Unlock size={14} /> : <Lock size={14} />} 
        label={targetObject.locked ? "Unlock" : "Lock"} 
        onClick={() => handleAction(() => updateObject(targetId, { locked: !targetObject.locked }))} 
      />
      
      <ContextMenuItem 
        icon={<Trash2 size={14} className="text-red-400" />} 
        label="Delete" 
        shortcut="Del"
        className="text-red-400 hover:bg-red-500/10"
        onClick={() => handleAction(() => removeObject(targetId))} 
      />
    </div>
  );
};

const ContextMenuItem = ({ 
  icon, 
  label, 
  shortcut, 
  onClick,
  className 
}: { 
  icon: React.ReactNode, 
  label: string, 
  shortcut?: string,
  onClick: () => void,
  className?: string
}) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/5 transition-colors text-left",
      className
    )}
  >
    <span className="opacity-70">{icon}</span>
    <span className="flex-1">{label}</span>
    {shortcut && <span className="text-[10px] text-neutral-600 font-mono">{shortcut}</span>}
  </button>
);
