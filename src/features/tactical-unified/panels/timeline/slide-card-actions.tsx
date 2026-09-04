'use client';

/**
 * slide-card-actions.tsx
 * Floating action buttons (hover overlay) for SlideCard
 */

import { ChevronLeft, ChevronRight, Copy, Trash2 } from 'lucide-react';

interface SlideCardActionsProps {
  slideId: string;
  canDelete: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onDuplicate: (id: string) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onDelete: (id: string) => void;
}

export function SlideCardActions({
  slideId,
  canDelete,
  canMoveLeft,
  canMoveRight,
  onDuplicate,
  onMoveLeft,
  onMoveRight,
  onDelete,
}: SlideCardActionsProps) {
  return (
    <div className="absolute -top-2 -right-1 hidden group-hover:flex items-center gap-0.5 bg-[#1e1e24] border border-white/20 rounded-md shadow-lg p-0.5 z-20">
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

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate(slideId);
        }}
        className="flex items-center justify-center w-4 h-4 rounded text-white/60 hover:text-purple-300 hover:bg-purple-500/20 cursor-pointer"
        title="Duplicate scene"
        aria-label="Duplicate scene"
      >
        <Copy size={9} />
      </button>

      {canDelete && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(slideId);
          }}
          className="flex items-center justify-center w-4 h-4 rounded text-white/60 hover:text-red-400 hover:bg-red-500/20 cursor-pointer"
          title="Delete scene"
          aria-label="Delete scene"
        >
          <Trash2 size={9} />
        </button>
      )}
    </div>
  );
}
