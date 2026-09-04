'use client';

/**
 * use-unified-canvas-state.ts
 * Store selector hook for UnifiedCanvas — centralises all useTacticalUnifiedStore calls
 */

import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';

export function useUnifiedCanvasState() {
  const aspectRatio = useTacticalUnifiedStore((s) => s.project.aspectRatio);
  const backgroundType = useTacticalUnifiedStore((s) => s.project.backgroundType);
  const backgroundImageUrl = useTacticalUnifiedStore((s) => s.project.backgroundImageUrl);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const clearSelection = useTacticalUnifiedStore((s) => s.clearSelection);
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const connectingPlayerId = useTacticalUnifiedStore((s) => s.connectingPlayerId);
  const setActiveSlide = useTacticalUnifiedStore((s) => s.setActiveSlide);
  const setBackgroundImageUrl = useTacticalUnifiedStore((s) => s.setBackgroundImageUrl);
  const setBackgroundType = useTacticalUnifiedStore((s) => s.setBackgroundType);
  const isExporting = useTacticalUnifiedStore((s) => s.isExporting);
  const setIsExporting = useTacticalUnifiedStore((s) => s.setIsExporting);
  const isPlaying = useTacticalUnifiedStore((s) => s.isPlaying);
  const updateText = useTacticalUnifiedStore((s) => s.updateText);
  const removeText = useTacticalUnifiedStore((s) => s.removeText);
  const setBoundaryBox = useTacticalUnifiedStore((s) => s.setBoundaryBox);

  return {
    aspectRatio,
    backgroundType,
    backgroundImageUrl,
    activeSlideId,
    activeSlide,
    clearSelection,
    activeTool,
    connectingPlayerId,
    setActiveSlide,
    setBackgroundImageUrl,
    setBackgroundType,
    isExporting,
    setIsExporting,
    isPlaying,
    updateText,
    removeText,
    setBoundaryBox,
  };
}
