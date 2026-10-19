'use client';

import { forwardRef, useEffect, useMemo } from 'react';
import {
  type CanvasCoreHandle,
  CanvasStageContainer,
  CanvasStoreProvider,
  createCanvasStore,
} from '@/features/tactical-unified/core';
import { selectActiveSlide } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';

export interface FullTacticalCanvasProps {
  className?: string;
  imageAspect?: number;
}

export const FullTacticalCanvas = forwardRef<
  CanvasCoreHandle,
  FullTacticalCanvasProps
>(function FullTacticalCanvas({ className = '', imageAspect = 16 / 9 }, ref) {
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const updateSlide = useTacticalUnifiedStore((s) => s.updateSlide);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Initialize store only on slide switch (flicker-free initial props)
  const storeApi = useMemo(() => {
    return createCanvasStore({
      mode: 'tactical-board',
      markerMode: 'all',
      backgroundImageUrl: activeSlide?.backgroundImageUrl,
      defaultBoundaryBox: activeSlide?.boundaryBox,
      defaultPitchTransform: activeSlide?.pitchTransform,
      initialAnnotations: activeSlide
        ? JSON.stringify({
            arrows: activeSlide.arrows,
            zones: activeSlide.zones,
            texts: activeSlide.texts,
            markers: activeSlide.players,
          })
        : undefined,
    });
  }, [activeSlide?.id]);

  // キャンバス内のアノテーション・マーカー変更時に、アクティブスライドへの反映を同期
  useEffect(() => {
    if (!activeSlideId) return;

    let prevAnnotationsJson = JSON.stringify(storeApi.getState().annotations);
    const unsubscribe = storeApi.subscribe((state) => {
      const currentJson = JSON.stringify(state.annotations);
      if (currentJson !== prevAnnotationsJson) {
        prevAnnotationsJson = currentJson;
        updateSlide(activeSlideId, {
          arrows: state.annotations.arrows,
          zones: state.annotations.zones,
          texts: state.annotations.texts,
          players: state.annotations.markers,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [storeApi, activeSlideId, updateSlide]);

  return (
    <CanvasStoreProvider store={storeApi}>
      <CanvasStageContainer
        ref={ref}
        className={className}
        imageAspect={imageAspect}
      />
    </CanvasStoreProvider>
  );
});
