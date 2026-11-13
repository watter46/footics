'use client';

/**
 * timeline-bar.tsx — Bottom Timeline Bar for Unified Tactical Canvas
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
import { getSlideSnapTime } from '@/features/tactical-unified/hooks/tactical-playback-controls';
import { selectDomainActivePhaseSlides } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  usePlaybackStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { AddSlideButton } from './add-slide-button';
import { BatchTransitionPopover } from './batch-transition-popover';
import { DirectorCameraTimeline } from './director-camera-timeline';
import { PlaybackControls } from './playback-controls';
import { SlideCard, SlideCardOverlay } from './slide-card';
import { TransitionConnector } from './transition-connector';
import { useTimelineScroll } from './use-timeline-scroll';

export function TimelineBar() {
  const project = useDocumentStore((s) => s.project);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const setActiveSlideId = useSessionStore((s) => s.setActiveSlideId);
  const workspaceMode = useSessionStore((s) => s.workspaceMode);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const playbackSlideIndex = usePlaybackStore((s) => s.playbackSlideIndex);
  const playbackTransitionIndex = usePlaybackStore(
    (s) => s.playbackTransitionIndex,
  );
  const setPlaybackIndices = usePlaybackStore((s) => s.setPlaybackIndices);
  const seekTo = usePlaybackStore((s) => s.seekTo);
  const slides = selectDomainActivePhaseSlides(project, activePhaseId);

  const reorderSlides = useCallback(
    (orderedSlideIds: string[]) => {
      dispatch({
        type: 'REORDER_SLIDES',
        phaseId: activePhaseId,
        orderedSlideIds,
      });
    },
    [dispatch, activePhaseId],
  );

  const handleDeleteSlide = useCallback(
    (slideId: string) => {
      const remaining = slides.filter((s) => s.id !== slideId);
      const deletedIdx = slides.findIndex((s) => s.id === slideId);
      dispatch({ type: 'DELETE_SLIDE', phaseId: activePhaseId, slideId });
      if (activeSlideId === slideId && remaining.length > 0) {
        const nextSlide =
          remaining[Math.max(0, deletedIdx - 1)] ?? remaining[0];
        if (nextSlide) setActiveSlideId(nextSlide.id);
      }
    },
    [slides, dispatch, activePhaseId, activeSlideId, setActiveSlideId],
  );

  const handleDuplicateSlide = useCallback(
    (slideId: string) => {
      const newSlideId = crypto.randomUUID();
      dispatch({
        type: 'DUPLICATE_SLIDE',
        phaseId: activePhaseId,
        slideId,
        newSlideId,
      });
      setActiveSlideId(newSlideId);
    },
    [dispatch, activePhaseId, setActiveSlideId],
  );

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchButtonRef, setBatchButtonRef] = useState<HTMLElement | null>(
    null,
  );

  const { containerRef, isDragging, onWheel, onPointerDown } =
    useTimelineScroll({ activeSlideId, slideCount: slides.length });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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
        const newOrder = arrayMove([...slides], oldIndex, newIndex);
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

  const handleSelectSlide = useCallback(
    (slideId: string) => {
      setActiveSlideId(slideId);
      const targetIndex = slides.findIndex((s) => s.id === slideId);
      if (targetIndex !== -1) {
        setPlaybackIndices(targetIndex, null);
        const startTimeMs = getSlideSnapTime(slides, targetIndex);
        seekTo(startTimeMs);
      }
    },
    [slides, setActiveSlideId, setPlaybackIndices, seekTo],
  );

  return (
    <footer
      className={`flex items-center justify-between ${
        workspaceMode === 'director' ? 'h-24' : 'h-16'
      } px-4 bg-[#121214] border-t border-white/[0.07] shrink-0 select-none z-10`}
    >
      <div className="flex items-center gap-3 shrink-0">
        <PlaybackControls />
      </div>

      <div className="w-px h-7 bg-white/[0.07] mx-3 shrink-0" />

      {workspaceMode === 'director' ? (
        <div className="flex-1 max-w-6xl mx-auto px-6 w-full flex items-center">
          <DirectorCameraTimeline />
        </div>
      ) : (
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
                    onSelect={handleSelectSlide}
                    onDelete={handleDeleteSlide}
                    onDuplicate={handleDuplicateSlide}
                    onMoveLeft={() => handleMoveSlide(i, 'left')}
                    onMoveRight={() => handleMoveSlide(i, 'right')}
                  />
                </Fragment>
              ))}
            </SortableContext>

            <AddSlideButton />
          </div>

          <DragOverlay>
            {activeDragSlide ? (
              <SlideCardOverlay
                slide={activeDragSlide.slide}
                index={activeDragSlide.index}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {workspaceMode !== 'director' && (
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
      )}

      <BatchTransitionPopover
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        referenceElement={batchButtonRef}
      />
    </footer>
  );
}
