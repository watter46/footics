'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  type BoundaryBox,
  DEFAULT_BOUNDARY_BOX_SCREENSHOT,
  type Player,
} from '@/lib/types/tactical-unified';

export interface StandaloneCanvasSessionOptions {
  imageDataUrl?: string;
  initialAnnotations?: string | null;
  onSaveAnnotations?: (annotationsJson: string) => void;
  debounceMs?: number;
}

export function useStandaloneCanvasSession({
  imageDataUrl,
  initialAnnotations,
  onSaveAnnotations,
  debounceMs = 500,
}: StandaloneCanvasSessionOptions) {
  const [isReady, setIsReady] = useState(false);
  const initializedRef = useRef(false);
  const lastSavedJsonRef = useRef<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store actions and state
  const resetProject = useTacticalUnifiedStore((s) => s.resetProject);
  const undo = useTacticalUnifiedStore((s) => s.undo);
  const redo = useTacticalUnifiedStore((s) => s.redo);
  const canUndo = useTacticalUnifiedStore((s) => s.past.length > 0);
  const canRedo = useTacticalUnifiedStore((s) => s.future.length > 0);

  // Initialize session
  useEffect(() => {
    if (!imageDataUrl || initializedRef.current) return;
    initializedRef.current = true;

    // Reset store to fresh default
    resetProject();

    const state = useTacticalUnifiedStore.getState();
    const activeSlideId = state.activeSlideId;
    const currentSlide = state.project.slides.find(
      (s) => s.id === activeSlideId,
    );

    const screenshotBox: BoundaryBox = {
      ...DEFAULT_BOUNDARY_BOX_SCREENSHOT,
      enabled: true,
      visible: true,
    };

    let restoredArrows = currentSlide?.arrows ?? [];
    let restoredZones = currentSlide?.zones ?? [];
    let restoredTexts = currentSlide?.texts ?? [];
    let restoredPlayers: Player[] =
      currentSlide?.players.map((p) => ({
        ...p,
        area: 'bench',
        visionCone: undefined,
        badges: [],
        connectLines: [],
        focus: undefined,
      })) ?? [];
    let restoredBoundaryBox = screenshotBox;

    if (initialAnnotations) {
      try {
        const parsed = JSON.parse(initialAnnotations);
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.arrows)) {
            restoredArrows = parsed.arrows;
          }
          if (Array.isArray(parsed.zones)) {
            restoredZones = parsed.zones;
          }
          if (Array.isArray(parsed.texts)) {
            restoredTexts = parsed.texts;
          }
          if (Array.isArray(parsed.players)) {
            const benchPlayers = restoredPlayers.filter(
              (p) => p.area === 'bench',
            );
            const pitchPlayers = parsed.players.filter(
              (p: any) => p.area === 'pitch',
            );
            restoredPlayers = [...benchPlayers, ...pitchPlayers];
          }
          if (parsed.boundaryBox) {
            restoredBoundaryBox = {
              ...screenshotBox,
              ...parsed.boundaryBox,
              enabled: true,
              visible: true,
            };
          }
        }
      } catch (err) {
        console.warn(
          '[useStandaloneCanvasSession] Failed to parse initialAnnotations:',
          err,
        );
      }
    }

    useTacticalUnifiedStore.setState((s) => ({
      project: {
        ...s.project,
        backgroundType: 'image',
        backgroundImageUrl: imageDataUrl,
        slides: s.project.slides.map((sl) => {
          if (sl.id !== activeSlideId) return sl;
          return {
            ...sl,
            backgroundType: 'image',
            backgroundImageUrl: imageDataUrl,
            boundaryBox: restoredBoundaryBox,
            pitchTransform: {
              panX: 0,
              panY: 0,
              zoom: 1,
              tilt: 0,
              isLocked: true,
            },
            ball: { ...sl.ball, visible: false },
            players: restoredPlayers,
            arrows: restoredArrows,
            zones: restoredZones,
            texts: restoredTexts,
          };
        }),
      },
      activeTool: 'select',
      past: [],
      future: [],
    }));

    // Record initial snapshot
    const initialSnapshot = JSON.stringify({
      version: '2.0',
      arrows: restoredArrows,
      zones: restoredZones,
      texts: restoredTexts,
      players: restoredPlayers.filter((p) => p.area === 'pitch'),
      boundaryBox: restoredBoundaryBox,
    });
    lastSavedJsonRef.current = initialSnapshot;
    setIsReady(true);
  }, [imageDataUrl, initialAnnotations, resetProject]);

  // Autosave and change detection
  useEffect(() => {
    if (!isReady || !onSaveAnnotations) return;

    const unsubscribe = useTacticalUnifiedStore.subscribe((state) => {
      const activeSlide = state.project.slides.find(
        (s) => s.id === state.activeSlideId,
      );
      if (!activeSlide) return;

      const serialized = JSON.stringify({
        version: '2.0',
        arrows: activeSlide.arrows,
        zones: activeSlide.zones,
        texts: activeSlide.texts,
        players: activeSlide.players.filter((p) => p.area === 'pitch'),
        boundaryBox: activeSlide.boundaryBox,
      });

      if (serialized === lastSavedJsonRef.current) return;
      lastSavedJsonRef.current = serialized;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        onSaveAnnotations(serialized);
      }, debounceMs);
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [isReady, onSaveAnnotations, debounceMs]);

  // Immediate save flush
  const saveNow = useCallback(() => {
    if (!onSaveAnnotations) return;
    const state = useTacticalUnifiedStore.getState();
    const activeSlide = state.project.slides.find(
      (s) => s.id === state.activeSlideId,
    );
    if (!activeSlide) return;

    const serialized = JSON.stringify({
      version: '2.0',
      arrows: activeSlide.arrows,
      zones: activeSlide.zones,
      texts: activeSlide.texts,
      players: activeSlide.players.filter((p) => p.area === 'pitch'),
      boundaryBox: activeSlide.boundaryBox,
    });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    lastSavedJsonRef.current = serialized;
    onSaveAnnotations(serialized);
  }, [onSaveAnnotations]);

  return {
    isReady,
    undo,
    redo,
    canUndo,
    canRedo,
    saveNow,
  };
}
