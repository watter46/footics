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
import { Sliders } from 'lucide-react';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { ActionButton } from '@/components/ui/action-button';
import { selectActivePhaseSlides } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { AddSlideButton } from './add-slide-button';
import { BatchTransitionPopover } from './batch-transition-popover';
import { PlaybackControls } from './playback-controls';
import { SlideCard, SlideCardOverlay } from './slide-card';
import { TransitionConnector } from './transition-connector';
import { useTimelineScroll } from './use-timeline-scroll';

export function TimelineBar() {
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const isPlaying = useTacticalUnifiedStoreContext((s) => s.isPlaying);
  const playbackSlideIndex = useTacticalUnifiedStoreContext(
    (s) => s.playbackSlideIndex,
  );
  const playbackTransitionIndex = useTacticalUnifiedStoreContext(
    (s) => s.playbackTransitionIndex,
  );
  const setActiveSlide = useTacticalUnifiedStoreContext(
    (s) => s.setActiveSlide,
  );
  const deleteSlide = useTacticalUnifiedStoreContext((s) => s.deleteSlide);
  const duplicateSlide = useTacticalUnifiedStoreContext(
    (s) => s.duplicateSlide,
  );
  const reorderSlides = useTacticalUnifiedStoreContext((s) => s.reorderSlides);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchButtonRef, setBatchButtonRef] = useState<HTMLElement | null>(
    null,
  );

  const { containerRef, isDragging, onWheel, onPointerDown } =
    useTimelineScroll({
      activeSlideId,
      slideCount: slides.length,
    });

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
    <footer className="flex items-center justify-between h-16 px-4 bg-[#121214] border-t border-white/[0.07] shrink-0 select-none z-10">
      {/* Left: Playback Controls */}
      <div className="flex items-center gap-3 shrink-0">
        <PlaybackControls />
      </div>

      <div className="w-px h-7 bg-white/[0.07] mx-3 shrink-0" />

      {/* Center: Slide Strip with @dnd-kit horizontal sorting */}
      <DndContext
        id="tactical-timeline-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          ref={containerRef}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          className={`flex items-center gap-2 flex-1 min-w-0 overflow-x-auto timeline-scrollbar py-1 ${
            isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
          }`}
        >
          <SortableContext
            items={slideIds}
            strategy={horizontalListSortingStrategy}
          >
            {slides.map((slide, i) => (
              <Fragment key={slide.id}>
                {i > 0 && (
                  <TransitionConnector
                    targetSlide={slide}
                    targetIndex={i}
                    isPlaybackActive={
                      isPlaying && playbackTransitionIndex === i
                    }
                  />
                )}
                <SlideCard
                  slide={slide}
                  index={i}
                  isActive={activeSlideId === slide.id}
                  isPlaybackActive={isPlaying && playbackSlideIndex === i}
                  canDelete={slides.length > 1}
                  canMoveLeft={i > 0}
                  canMoveRight={i < slides.length - 1}
                  onSelect={setActiveSlide}
                  onDelete={deleteSlide}
                  onDuplicate={duplicateSlide}
                  onMoveLeft={() => handleMoveSlide(i, 'left')}
                  onMoveRight={() => handleMoveSlide(i, 'right')}
                />
              </Fragment>
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
      <div className="flex items-center gap-3 shrink-0">
        <ActionButton
          ref={setBatchButtonRef as React.Ref<HTMLButtonElement>}
          variant={isBatchOpen ? 'primary' : 'default'}
          size="sm"
          onClick={() => setIsBatchOpen((prev) => !prev)}
          icon={
            <Sliders
              size={13}
              strokeWidth={1.5}
              className={isBatchOpen ? 'text-white' : 'text-[#FF8100]'}
            />
          }
          aria-label="一括設定"
          title="全シーンのトランジションを一括設定"
        >
          <span className="hidden sm:inline">一括設定</span>
        </ActionButton>

        <div className="hidden lg:flex items-center gap-3 pl-3 text-[10px] text-[#71717A] border-l border-white/[0.07]">
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded-[4px] bg-[#0D0D0E] text-[#A1A1AA] border border-white/[0.07] font-mono text-[9px]">
              L-Click
            </span>
            <span>Add Scene</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded-[4px] bg-[#0D0D0E] text-[#A1A1AA] border border-white/[0.07] font-mono text-[9px]">
              R-Click
            </span>
            <span>Duplicate</span>
          </div>
        </div>
      </div>

      {/* Batch Transition Popover */}
      <BatchTransitionPopover
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        referenceElement={batchButtonRef}
      />
    </footer>
  );
}
