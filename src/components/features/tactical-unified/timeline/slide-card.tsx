'use client';

/**
 * slide-card.tsx
 * Individual scene thumbnail card in the bottom timeline bar
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Layers,
  Trash2,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Slide } from '@/lib/types/tactical-unified';

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

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
    });
  };

  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleScroll = () => setContextMenu(null);
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [contextMenu]);

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
      {!isDragging && (
        <div className="absolute -top-2 -right-1 hidden group-hover:flex items-center gap-0.5 bg-[#1e1e24] border border-white/20 rounded-md shadow-lg p-0.5 z-20">
          {/* Move Left */}
          {canMoveLeft && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
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
              onPointerDown={(e) => e.stopPropagation()}
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
            onPointerDown={(e) => e.stopPropagation()}
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
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(slide.id);
              }}
              className="flex items-center justify-center w-4 h-4 rounded text-white/60 hover:text-red-400 hover:bg-red-500/20 cursor-pointer"
              title="Delete scene"
              aria-label="Delete scene"
            >
              <Trash2 size={9} />
            </button>
          )}
        </div>
      )}

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          role="menu"
          tabIndex={-1}
          className="fixed z-50 min-w-[140px] bg-[#1a1a22] border border-white/15 rounded-lg shadow-xl py-1 text-xs text-white/90 backdrop-blur-md"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 150),
            top: Math.max(10, contextMenu.y - 120),
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setContextMenu(null);
          }}
        >
          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
              onDuplicate(slide.id);
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <Copy size={13} className="text-purple-400" />
            <span>シーンを複製</span>
          </button>

          {canMoveLeft && (
            <button
              type="button"
              onClick={() => {
                setContextMenu(null);
                onMoveLeft();
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <ArrowLeft size={13} className="text-blue-400" />
              <span>左へ移動</span>
            </button>
          )}

          {canMoveRight && (
            <button
              type="button"
              onClick={() => {
                setContextMenu(null);
                onMoveRight();
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <ArrowRight size={13} className="text-blue-400" />
              <span>右へ移動</span>
            </button>
          )}

          {canDelete && (
            <>
              <div className="h-px bg-white/10 my-1" />
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  onDelete(slide.id);
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-red-400 hover:bg-red-500/20 hover:text-red-300 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>シーンを削除</span>
              </button>
            </>
          )}
        </div>
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
    (slide.arrows?.length ?? 0) +
    (slide.zones?.length ?? 0) +
    (slide.texts?.length ?? 0);

  return (
    <div className="flex flex-col justify-between w-24 h-12 px-2 py-1.5 rounded-lg border border-blue-500 bg-[#161b26] text-white shadow-2xl shadow-blue-500/30 ring-2 ring-blue-500 scale-105 cursor-grabbing relative overflow-hidden select-none">
      {/* Top row: Scene Index & Label */}
      <div className="flex items-center justify-between w-full">
        <span className="text-[11px] font-bold font-mono text-blue-300">
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
    </div>
  );
}
