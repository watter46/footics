import React, { useMemo } from 'react';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Layers, 
  Settings2,
  GripVertical
} from 'lucide-react';
import { useEditorStore } from '../../../stores/useEditorStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SortableLayerItem = ({ 
  layer, 
  isSelected, 
  onSelect, 
  onToggleVisibility, 
  onToggleLock,
  onMouseEnter,
  onMouseLeave
}: { 
  layer: any, 
  isSelected: boolean, 
  onSelect: (id: string) => void,
  onToggleVisibility: (id: string, e: React.MouseEvent) => void,
  onToggleLock: (id: string, e: React.MouseEvent) => void,
  onMouseEnter: () => void,
  onMouseLeave: () => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(layer.id)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer relative",
        isSelected 
            ? "bg-blue-600/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
            : "bg-white/5 border-transparent hover:border-white/10 hover:bg-white/10",
        isDragging && "opacity-50 grayscale shadow-2xl scale-[1.02] bg-neutral-800"
      )}
    >
      <div className="text-neutral-600 group-hover:text-neutral-400 transition-colors">
        <GripVertical size={14} />
      </div>
      <div className="flex flex-col flex-1 min-w-0 pointer-events-none">
        <span className={cn("text-xs font-medium truncate", isSelected ? "text-blue-400" : "text-neutral-300")}>
            {layer.name || (layer.type === 'image' ? 'image' : `${layer.type} ${layer.index}`)}
        </span>
        <span className="text-[9px] text-neutral-600 uppercase tracking-tighter">{layer.type}</span>
      </div>
      <div className="flex items-center gap-1">
        <button 
          onClick={(e) => onToggleVisibility(layer.id, e)}
          className={cn(
            "p-1 hover:text-white transition-colors relative pointer-events-auto",
            layer.visible ? "text-neutral-500" : "text-red-500"
          )}
        >
          {layer.visible ? <Eye size={12} /> : (
            <div className="relative">
                <Eye size={12} className="opacity-40" />
                <div className="absolute top-1/2 left-1/2 w-full h-[1.5px] bg-red-500 -translate-x-1/2 -translate-y-1/2 rotate-[-45deg]" />
            </div>
          )}
        </button>
        <button 
          onClick={(e) => onToggleLock(layer.id, e)}
          className={cn(
            "p-1 hover:text-white transition-colors relative pointer-events-auto",
            layer.locked ? "text-orange-500" : "text-neutral-500"
          )}
        >
          {layer.locked ? (
            <div className="relative">
                <Lock size={12} />
                <div className="absolute top-1/2 left-1/2 w-full h-[1.5px] bg-orange-400 -translate-x-1/2 -translate-y-1/2 rotate-[-45deg]" />
            </div>
          ) : <Unlock size={12} />}
        </button>
      </div>
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { 
    objects,
    setObjects,
    updateObject,
    globalProperties, 
    updateGlobalProperties, 
    selectedObjectId,
    setSelectedObject,
    setHoveredObject,
    saveHistory
  } = useEditorStore();

  const layers = useMemo(() => {
      return [...objects].reverse().map((obj, i) => ({
          ...obj,
          index: objects.length - i
      }));
  }, [objects]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = objects.findIndex((o) => o.id === active.id);
      const newIndex = objects.findIndex((o) => o.id === over.id);

      const newObjects = arrayMove(objects, oldIndex, newIndex);
      setObjects(newObjects);
      saveHistory();
    }
  };

  const handleSelect = (id: string) => {
    setSelectedObject(id);
  };

  const handleToggleVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const obj = objects.find(o => o.id === id);
    if (obj) {
        updateObject(id, { visible: !obj.visible });
        saveHistory();
    }
  };

  const handleToggleLock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const obj = objects.find(o => o.id === id);
    if (obj) {
        updateObject(id, { locked: !obj.locked });
        saveHistory();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto min-w-0">
      {/* Properties Section */}
      <section className="p-5 border-b border-white/5 space-y-6">
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-widest">
          <Settings2 size={14} strokeWidth={2.5} />
          Settings
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-neutral-500 font-bold uppercase">Stroke</label>
              <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-1.5">
                <input 
                  type="color" 
                  value={globalProperties.stroke.substring(0, 7)}
                  onChange={(e) => updateGlobalProperties({ stroke: e.target.value })}
                  className="w-5 h-5 rounded-md border-none p-0 cursor-pointer bg-transparent"
                />
                <span className="text-[10px] font-mono text-neutral-400 uppercase">{globalProperties.stroke.substring(0, 7)}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-neutral-500 font-bold uppercase">Fill</label>
              <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-1.5">
                <input 
                  type="color" 
                  value={globalProperties.fill.substring(0, 7)}
                  onChange={(e) => {
                    const alpha = globalProperties.fill.length === 9 ? globalProperties.fill.substring(7) : '33';
                    updateGlobalProperties({ fill: e.target.value + alpha });
                  }}
                  className="w-5 h-5 rounded-md border-none p-0 cursor-pointer bg-transparent"
                />
                <span className="text-[10px] font-mono text-neutral-400 uppercase">{globalProperties.fill.substring(0, 7)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-neutral-500 font-bold uppercase flex justify-between">
              Stroke Width <span>{globalProperties.strokeWidth}px</span>
            </label>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={globalProperties.strokeWidth}
              onChange={(e) => updateGlobalProperties({ strokeWidth: parseInt(e.target.value) })}
              className="w-full accent-blue-600 appearance-none bg-neutral-800 h-1 rounded-full cursor-pointer"
            />
          </div>

          <div className="flex gap-2">
            <button 
                onClick={() => updateGlobalProperties({ strokeDashArray: null })}
                className={cn(
                    "flex-1 py-2 px-3 border rounded-lg text-[10px] font-bold uppercase transition-all",
                    !globalProperties.strokeDashArray 
                        ? "bg-blue-600 text-white border-blue-500" 
                        : "bg-white/5 border-white/10 text-neutral-500 hover:bg-white/10"
                )}
            >
              Solid
            </button>
            <button 
                onClick={() => updateGlobalProperties({ strokeDashArray: [5, 5] })}
                className={cn(
                    "flex-1 py-2 px-3 border rounded-lg text-[10px] font-bold uppercase transition-all",
                    globalProperties.strokeDashArray 
                        ? "bg-blue-600 text-white border-blue-500" 
                        : "bg-white/5 border-white/10 text-neutral-500 hover:bg-white/10"
                )}
            >
              Dashed
            </button>
          </div>
        </div>
      </section>

      {/* Layer List Section */}
      <section className="flex-1 flex flex-col min-h-0">
        <div className="p-5 flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-white/5">
          <div className="flex items-center gap-2">
            <Layers size={14} strokeWidth={2.5} />
            Layers
          </div>
          <span className="bg-neutral-800 px-1.5 py-0.5 rounded text-[8px]">{layers.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {layers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-neutral-600 space-y-2 opacity-50">
              <Layers size={32} strokeWidth={1} />
              <span className="text-[10px]">No layers yet</span>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={layers.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {layers.map((layer) => (
                    <SortableLayerItem
                      key={layer.id}
                      layer={layer}
                      isSelected={selectedObjectId === layer.id}
                      onSelect={handleSelect}
                      onToggleVisibility={handleToggleVisibility}
                      onToggleLock={handleToggleLock}
                      onMouseEnter={() => setHoveredObject(layer.id)}
                      onMouseLeave={() => setHoveredObject(null)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </section>
    </div>
  );
};
