'use client';

/**
 * timeline-bar.tsx
 * Professional Bottom Timeline Bar for Unified Tactical Canvas
 *
 * Features:
 *   - Playback controller (Play/Pause, Scene counter, Total duration)
 *   - Scene thumbnail strip with quick reordering, duplication & deletion
 *   - Add Scene button with Left-click (Object-free) & Right-click (Full Duplicate)
 *   - Keyboard shortcut hint
 */

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useCallback, useMemo, useState } from 'react';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import { AddSlideButton } from './add-slide-button';
import { PlaybackControls } from './playback-controls';
import { SlideCard, SlideCardOverlay } from './slide-card';

export function TimelineBar() {
  const slides = useTacticalUnifiedStore((s) => s.project.slides);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const setActiveSlide = useTacticalUnifiedStore((s) => s.setActiveSlide);
  const deleteSlide = useTacticalUnifiedStore((s) => s.deleteSlide);
  const duplicateSlide = useTacticalUnifiedStore((s) => s.duplicateSlide);
  const reorderSlides = useTacticalUnifiedStore((s) => s.reorderSlides);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const slideIds = useMemo(() => slides.map((s) => s.id), [slides]);

  const activeDragSlide = useMemo(() => {
    if (!activeDragId) return null;
    const index = slides.findIndex((s) => s.id === activeDragId);
    if (index === -1) return null;
    return { slide: slides[index], index };
  }, [activeDragId, slides]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragId(null);

      if (!over || active.id === over.id) return;

      const oldIndex = slides.findIndex((sl) => sl.id === active.id);
      const newIndex = slides.findIndex((sl) => sl.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = arrayMove(slides, oldIndex, newIndex);
        reorderSlides(newOrder.map((sl) => sl.id));
      }
    },
    [slides, reorderSlides],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const handleMoveSlide = useCallback(
    (index: number, direction: 'left' | 'right') => {
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= slides.length) return;

      const newOrder = [...slides];
      const [moved] = newOrder.splice(index, 1);
      newOrder.splice(targetIndex, 0, moved);
      reorderSlides(newOrder.map((sl) => sl.id));
    },
    [slides, reorderSlides],
  );

  return (
    <footer className="flex items-center justify-between h-16 px-4 bg-[#0d0d10] border-t border-white/10 shrink-0 select-none z-10">
      {/* Left: Playback Controls */}
      <div className="flex items-center gap-3 shrink-0">
        <PlaybackControls />
      </div>

      <div className="w-px h-7 bg-white/10 mx-3 shrink-0" />

      {/* Center: Slide Strip with @dnd-kit horizontal sorting */}
      <DndContext
        id="tactical-timeline-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex items-center gap-2 flex-1 overflow-x-auto custom-scrollbar py-1">
          <SortableContext
            items={slideIds}
            strategy={horizontalListSortingStrategy}
          >
            {slides.map((slide, i) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                index={i}
                isActive={activeSlideId === slide.id}
                canDelete={slides.length > 1}
                canMoveLeft={i > 0}
                canMoveRight={i < slides.length - 1}
                onSelect={setActiveSlide}
                onDelete={deleteSlide}
                onDuplicate={duplicateSlide}
                onMoveLeft={() => handleMoveSlide(i, 'left')}
                onMoveRight={() => handleMoveSlide(i, 'right')}
              />
            ))}
          </SortableContext>

          {/* Add Scene Button */}
          <AddSlideButton />
        </div>

        {/* Drag Overlay with visual card clone */}
        <DragOverlay>
          {activeDragSlide ? (
            <SlideCardOverlay
              slide={activeDragSlide.slide}
              index={activeDragSlide.index}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Right: Quick Action & Shortcut Guides */}
      <div className="hidden lg:flex items-center gap-3 pl-3 text-[10px] text-white/40 border-l border-white/10 shrink-0">
        <div className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-mono text-[9px]">
            L-Click
          </span>
          <span>Add Scene</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-mono text-[9px]">
            R-Click
          </span>
          <span>Duplicate</span>
        </div>
      </div>
    </footer>
  );
}
