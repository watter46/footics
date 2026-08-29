'use client';

/**
 * slide-card.tsx
 * Individual scene thumbnail card in the bottom timeline bar
 */

import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Layers,
  Trash2,
} from 'lucide-react';
import type React from 'react';
import type { Slide } from '@/lib/types/tactical-unified';

interface SlideCardProps {
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
  const durationSec = (slide.transitionDurationMs ?? 1000) / 1000;
  const pauseSec = (slide.pauseMs ?? 500) / 1000;
  const totalSceneSec = durationSec + pauseSec;

  const annotationCount =
    (slide.arrows?.length ?? 0) +
    (slide.zones?.length ?? 0) +
    (slide.texts?.length ?? 0);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDuplicate(slide.id);
  };

  return (
    <div className="relative group shrink-0 select-none">
      {/* Thumbnail Card */}
      <button
        type="button"
        onClick={() => onSelect(slide.id)}
        onContextMenu={handleContextMenu}
        className={[
          'flex flex-col justify-between w-24 h-12 px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer relative overflow-hidden',
          isActive
            ? 'border-blue-500 bg-blue-600/20 text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
            : 'border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/10 hover:text-white',
        ].join(' ')}
        title={`${slide.label ?? `Scene ${index + 1}`} (Right-click to duplicate)`}
        aria-label={`Scene ${index + 1}`}
      >
        {/* Top row: Scene Index & Label */}
        <div className="flex items-center justify-between w-full">
          <span
            className={`text-[11px] font-bold font-mono ${isActive ? 'text-blue-300' : 'text-white/90'}`}
          >
            {index + 1}
          </span>
          <span className="text-[9px] text-white/50 truncate max-w-[50px]">
            {slide.label ? slide.label : `Scene ${index + 1}`}
          </span>
        </div>

        {/* Bottom row: Time badge & Drawings indicator */}
        <div className="flex items-center justify-between w-full text-[9px] text-white/60 font-mono">
          <span className="flex items-center gap-0.5" title="Duration + Pause">
            <Clock size={8} className="text-white/40" />
            {totalSceneSec.toFixed(1)}s
          </span>

          {annotationCount > 0 && (
            <span
              className="flex items-center gap-0.5 text-blue-400/80"
              title={`${annotationCount} drawings`}
            >
              <Layers size={8} />
              {annotationCount}
            </span>
          )}
        </div>
      </button>

      {/* Floating Action Controls on Hover */}
      <div className="absolute -top-2 -right-1 hidden group-hover:flex items-center gap-0.5 bg-[#1e1e24] border border-white/20 rounded-md shadow-lg p-0.5 z-20">
        {/* Move Left */}
        {canMoveLeft && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveLeft();
            }}
            className="flex items-center justify-center w-4 h-4 rounded text-white/60 hover:text-white hover:bg-white/15 cursor-pointer"
            title="Move left"
            aria-label="Move left"
          >
            <ChevronLeft size={10} />
          </button>
        )}

        {/* Move Right */}
        {canMoveRight && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveRight();
            }}
            className="flex items-center justify-center w-4 h-4 rounded text-white/60 hover:text-white hover:bg-white/15 cursor-pointer"
            title="Move right"
            aria-label="Move right"
          >
            <ChevronRight size={10} />
          </button>
        )}

        {/* Duplicate Scene */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(slide.id);
          }}
          className="flex items-center justify-center w-4 h-4 rounded text-white/60 hover:text-purple-300 hover:bg-purple-500/20 cursor-pointer"
          title="Duplicate scene"
          aria-label="Duplicate scene"
        >
          <Copy size={9} />
        </button>

        {/* Delete Scene */}
        {canDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Delete this scene?')) {
                onDelete(slide.id);
              }
            }}
            className="flex items-center justify-center w-4 h-4 rounded text-white/60 hover:text-red-400 hover:bg-red-500/20 cursor-pointer"
            title="Delete scene"
            aria-label="Delete scene"
          >
            <Trash2 size={9} />
          </button>
        )}
      </div>
    </div>
  );
}
