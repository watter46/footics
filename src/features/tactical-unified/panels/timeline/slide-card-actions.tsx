'use client';

/**
 * slide-card-actions.tsx
 * Floating action buttons (hover overlay) for SlideCard
 */

import { ChevronLeft, ChevronRight, Copy, Sliders, Trash2 } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';

interface SlideCardActionsProps {
  slideId: string;
  canDelete: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onDuplicate: (id: string) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onDelete: (id: string) => void;
  onOpenTransitionSettings?: () => void;
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
  onOpenTransitionSettings,
}: SlideCardActionsProps) {
  return (
    <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5 bg-[#18181B] border border-white/[0.08] rounded shadow-md p-0.5 z-20">
      {onOpenTransitionSettings && (
        <IconButton
          size="xs"
          variant="ghost"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpenTransitionSettings();
          }}
          className="text-white/60 hover:text-[#FF8100] hover:bg-[#FF8100]/20"
          title="Transition settings"
          aria-label="Open transition settings"
        >
          <Sliders size={11} />
        </IconButton>
      )}

      {canMoveLeft && (
        <IconButton
          size="xs"
          variant="ghost"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onMoveLeft();
          }}
          className="text-white/60 hover:text-white hover:bg-white/15"
          title="Move left"
          aria-label="Move left"
        >
          <ChevronLeft size={11} />
        </IconButton>
      )}

      {canMoveRight && (
        <IconButton
          size="xs"
          variant="ghost"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onMoveRight();
          }}
          className="text-white/60 hover:text-white hover:bg-white/15"
          title="Move right"
          aria-label="Move right"
        >
          <ChevronRight size={11} />
        </IconButton>
      )}

      <IconButton
        size="xs"
        variant="ghost"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate(slideId);
        }}
        className="text-white/60 hover:text-[#FF8100] hover:bg-[#FF8100]/20"
        title="Duplicate scene"
        aria-label="Duplicate scene"
      >
        <Copy size={11} />
      </IconButton>

      {canDelete && (
        <IconButton
          size="xs"
          variant="ghost"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(slideId);
          }}
          className="text-white/60 hover:text-[#EB3B5A] hover:bg-[#EB3B5A]/20"
          title="Delete scene"
          aria-label="Delete scene"
        >
          <Trash2 size={11} />
        </IconButton>
      )}
    </div>
  );
}
