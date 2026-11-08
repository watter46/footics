import { type RefObject, useEffect } from 'react';
import type {
  ActionCameraCue,
  PitchTransform,
  Slide,
} from '@/lib/types/tactical-unified';

interface UsePreviewWheelZoomParams {
  containerRef: RefObject<HTMLDivElement | null>;
  activeCue?: ActionCameraCue;
  resolvedCamera: PitchTransform | null;
  activeSlide?: Slide | null;
  currentTimeMs: number;
  upsertActionCameraCue: (
    timeMs: number,
    cue: Partial<Omit<ActionCameraCue, 'id'>>,
    existingId?: string,
  ) => void;
  updatePitchTransform: (
    slideId: string,
    transform: Partial<PitchTransform>,
  ) => void;
}

export function usePreviewWheelZoom({
  containerRef,
  activeCue,
  resolvedCamera,
  activeSlide,
  currentTimeMs,
  upsertActionCameraCue,
  updatePitchTransform,
}: UsePreviewWheelZoomParams) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX ?? 0;
      const clientY = e.clientY ?? 0;
      const mouseX = clientX - (rect.left ?? 0);
      const mouseY = clientY - (rect.top ?? 0);
      const centerX = (rect.width ?? 0) / 2;
      const centerY = (rect.height ?? 0) / 2;
      const dx = mouseX - centerX;
      const dy = mouseY - centerY;

      const currentZoom =
        activeCue?.zoom ??
        resolvedCamera?.zoom ??
        activeSlide?.pitchTransform?.zoom ??
        1.0;
      const currentPanX =
        activeCue?.panX ??
        resolvedCamera?.panX ??
        activeSlide?.pitchTransform?.panX ??
        0;
      const currentPanY =
        activeCue?.panY ??
        resolvedCamera?.panY ??
        activeSlide?.pitchTransform?.panY ??
        0;

      const nextZoom = Math.max(
        0.4,
        Math.min(3.0, +(currentZoom - e.deltaY * 0.0015).toFixed(2)),
      );
      const k = currentZoom === 0 ? 1 : nextZoom / currentZoom;

      const nextPanX = Math.round(currentPanX * k + dx * (1 - k));
      const nextPanY = Math.round(currentPanY * k + dy * (1 - k));

      upsertActionCameraCue(
        currentTimeMs,
        {
          zoom: nextZoom,
          panX: nextPanX,
          panY: nextPanY,
        },
        activeCue?.id,
      );
      if (activeSlide) {
        updatePitchTransform(activeSlide.id, {
          zoom: nextZoom,
          panX: nextPanX,
          panY: nextPanY,
        });
      }
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
    };
  }, [
    activeCue,
    resolvedCamera,
    activeSlide,
    currentTimeMs,
    upsertActionCameraCue,
    updatePitchTransform,
    containerRef,
  ]);
}
