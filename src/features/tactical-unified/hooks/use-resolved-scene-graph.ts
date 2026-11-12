'use client';

import { useMemo } from 'react';
import {
  useDocumentStore,
  usePlaybackStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import type {
  EphemeralSessionState,
  ResolvedSceneGraphDTO,
} from '@/lib/tactical/compiler/scene-graph-dto';
import type { StageViewport } from '@/lib/tactical/engine/coordinates';
import {
  type EvaluatedTimelineFrame,
  evaluateStaticSlideFrame,
  evaluateTimelineFrame,
} from '@/lib/tactical/engine/timeline-evaluator';
import {
  clampToScreenNorm,
  type Milliseconds,
} from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';

function createFallbackSlide(): DomainSlide {
  return {
    id: 'fallback-slide',
    index: 0,
    label: 'Slide',
    players: [],
    arrows: [],
    zones: [],
    texts: [],
    ball: {
      x: clampToScreenNorm(50),
      y: clampToScreenNorm(50),
      visible: true,
    },
    transitionDurationMs: 1000,
    pauseMs: 500,
    easing: 'linear',
  };
}

export function resolveSceneGraphFromState(params: {
  readonly project: DomainTacticalProject;
  readonly session: EphemeralSessionState;
  readonly isPlaying: boolean;
  readonly timeMs: Milliseconds;
  readonly viewport: StageViewport;
}): ResolvedSceneGraphDTO {
  const { project, session, isPlaying, timeMs, viewport } = params;

  const activePhase: DomainTacticalPhase | undefined =
    project.phases.find((p) => p.id === session.activePhaseId) ??
    project.phases[0];

  let frame: EvaluatedTimelineFrame;
  let prevSlide: DomainSlide | null = null;

  if (isPlaying && activePhase) {
    frame = evaluateTimelineFrame(activePhase, timeMs);
    prevSlide =
      frame.slideIndex > 0 ? activePhase.slides[frame.slideIndex - 1] : null;
  } else {
    const activeSlide =
      activePhase?.slides.find((s) => s.id === session.activeSlideId) ??
      activePhase?.slides[0] ??
      createFallbackSlide();

    const slideIndex =
      activePhase?.slides.findIndex((s) => s.id === activeSlide.id) ?? -1;
    prevSlide =
      activePhase && slideIndex > 0 ? activePhase.slides[slideIndex - 1] : null;

    frame = evaluateStaticSlideFrame(activeSlide, activeSlide.index ?? 0);
  }

  return compileSceneGraph(frame, session, viewport, prevSlide);
}

export function useResolvedSceneGraph(
  viewport: StageViewport,
): ResolvedSceneGraphDTO {
  const project = useDocumentStore((s) => s.project);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const selectedIds = useSessionStore((s) => s.selectedIds);
  const activeDragDelta = useSessionStore((s) => s.activeDragDelta);
  const drawingPreview = useSessionStore((s) => s.drawingPreview);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const timeMs = usePlaybackStore((s) => s.timeMs);

  const session: EphemeralSessionState = useMemo(
    () => ({
      activePhaseId,
      activeSlideId,
      selectedIds,
      activeDragDelta,
      drawingPreview,
    }),
    [
      activePhaseId,
      activeSlideId,
      selectedIds,
      activeDragDelta,
      drawingPreview,
    ],
  );

  return useMemo(
    () =>
      resolveSceneGraphFromState({
        project,
        session,
        isPlaying,
        timeMs,
        viewport,
      }),
    [
      project,
      session,
      isPlaying,
      timeMs,
      viewport.width,
      viewport.height,
      viewport.offsetX,
      viewport.offsetY,
    ],
  );
}
