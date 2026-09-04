'use client';

/**
 * slide-card.tsx
 * Individual scene thumbnail card in the bottom timeline bar
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Layers } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { Slide } from '@/lib/types/tactical-unified';
import { SlideCardActions } from './slide-card-actions';
import { SlideContextMenu } from './slide-context-menu';

export interface SlideCardProps {
  slide: Slide;
  index: number;
  isActive: boolean;
  canDelete: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}

export function SlideCard({
  slide,
  index,
  isActive,
  canDelete,
  canMoveLeft,
  canMoveRight,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveLeft,
  onMoveRight,
}: SlideCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const durationSec = (slide.transitionDurationMs ?? 1000) / 1000;
  const pauseSec = (slide.pauseMs ?? 500) / 1000;
  const totalSceneSec = durationSec + pauseSec;
  const annotationCount =
    (slide.arrows?.length ?? 0) + (slide.zones?.length ?? 0) + (slide.texts?.length ?? 0);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 20 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group shrink-0 select-none touch-none"
      {...attributes}
      {...listeners}
    >
      {/* Thumbnail Card */}
      <button
        type="button"
        onClick={() => onSelect(slide.id)}
        onContextMenu={handleContextMenu}
        className={[
          'flex flex-col justify-between w-24 h-12 px-2 py-1.5 rounded-lg border text-left transition-colors cursor-grab active:cursor-grabbing relative overflow-hidden',
          isActive
            ? 'border-blue-500 bg-blue-600/20 text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
            : 'border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/10 hover:text-white',
        ].join(' ')}
        title={`${slide.label ?? `Scene ${index + 1}`} (Drag to reorder, Right-click for options)`}
        aria-label={`Scene ${index + 1}`}
      >
        <div className="flex items-center justify-between w-full">
          <span className={`text-[11px] font-bold font-mono ${isActive ? 'text-blue-300' : 'text-white/90'}`}>
            {index + 1}
          </span>
          <span className="text-[9px] text-white/50 truncate max-w-[50px]">
            {slide.label ? slide.label : `Scene ${index + 1}`}
          </span>
        </div>

        <div className="flex items-center justify-between w-full text-[9px] text-white/60 font-mono">
          <span className="flex items-center gap-0.5" title="Duration + Pause">
            <Clock size={8} className="text-white/40" />
            {totalSceneSec.toFixed(1)}s
          </span>
          {annotationCount > 0 && (
            <span className="flex items-center gap-0.5 text-blue-400/80" title={`${annotationCount} drawings`}>
              <Layers size={8} />
              {annotationCount}
            </span>
          )}
        </div>
      </button>

      {/* Floating Action Controls on Hover */}
      {!isDragging && (
        <SlideCardActions
          slideId={slide.id}
          canDelete={canDelete}
          canMoveLeft={canMoveLeft}
          canMoveRight={canMoveRight}
          onDuplicate={onDuplicate}
          onMoveLeft={onMoveLeft}
          onMoveRight={onMoveRight}
          onDelete={onDelete}
        />
      )}

      {/* Right-click Context Menu */}
      {contextMenuPos && (
        <SlideContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          slideId={slide.id}
          canDelete={canDelete}
          canMoveLeft={canMoveLeft}
          canMoveRight={canMoveRight}
          onDuplicate={onDuplicate}
          onMoveLeft={onMoveLeft}
          onMoveRight={onMoveRight}
          onDelete={onDelete}
          onClose={() => setContextMenuPos(null)}
        />
      )}
    </div>
  );
}

export function SlideCardOverlay({
  slide,
  index,
}: {
  slide: Slide;
  index: number;
}) {
  const durationSec = (slide.transitionDurationMs ?? 1000) / 1000;
  const pauseSec = (slide.pauseMs ?? 500) / 1000;
  const totalSceneSec = durationSec + pauseSec;
  const annotationCount =
    (slide.arrows?.length ?? 0) + (slide.zones?.length ?? 0) + (slide.texts?.length ?? 0);

  return (
    <div className="flex flex-col justify-between w-24 h-12 px-2 py-1.5 rounded-lg border border-blue-500 bg-[#161b26] text-white shadow-2xl shadow-blue-500/30 ring-2 ring-blue-500 scale-105 cursor-grabbing relative overflow-hidden select-none">
      <div className="flex items-center justify-between w-full">
        <span className="text-[11px] font-bold font-mono text-blue-300">{index + 1}</span>
        <span className="text-[9px] text-white/50 truncate max-w-[50px]">
          {slide.label ? slide.label : `Scene ${index + 1}`}
        </span>
      </div>
      <div className="flex items-center justify-between w-full text-[9px] text-white/60 font-mono">
        <span className="flex items-center gap-0.5" title="Duration + Pause">
          <Clock size={8} className="text-white/40" />
          {totalSceneSec.toFixed(1)}s
        </span>
        {annotationCount > 0 && (
          <span className="flex items-center gap-0.5 text-blue-400/80" title={`${annotationCount} drawings`}>
            <Layers size={8} />
            {annotationCount}
          </span>
        )}
      </div>
    </div>
  );
}
