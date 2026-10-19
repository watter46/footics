'use client';

/**
 * context-hud.tsx
 * Web-layer wrapper around core/components/ContextHud.
 * Bridges CanvasStoreContext with useTacticalUnifiedStore and provides BallHud plugin.
 */

import type React from 'react';
import { useContext, useEffect, useMemo, useRef } from 'react';
import {
  type CanvasNodesRegistry,
  CanvasStoreContext,
  CanvasStoreProvider,
  ContextHud as CoreContextHud,
  createCanvasStore,
  type HudOffsetRect,
  type HudTarget,
  type SelectedObject,
  type SelectedObjectKind,
} from '@/features/tactical-unified/core';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { BallHud } from './ball-hud';
import { getBallTarget } from './hud-marker-targets';

export interface ContextHudProps {
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

function createSyncedCanvasStore(
  activeSlide: ReturnType<typeof selectActiveSlide>,
  activeSlideIdRef: React.MutableRefObject<string>,
) {
  const store = createCanvasStore({
    mode: 'tactical-board',
    markerMode: 'all',
    initialAnnotations: activeSlide
      ? JSON.stringify({
          markers: activeSlide.players ?? [],
          arrows: activeSlide.arrows ?? [],
          zones: activeSlide.zones ?? [],
          texts: activeSlide.texts ?? [],
        })
      : undefined,
  });

  const origUpdateMarker = store.getState().updateMarker;
  store.getState().updateMarker = (id, patch) => {
    origUpdateMarker(id, patch);
    if (activeSlideIdRef.current) {
      useTacticalUnifiedStore
        .getState()
        .updatePlayer(activeSlideIdRef.current, id, patch);
    }
  };

  const origRemoveMarker = store.getState().removeMarker;
  store.getState().removeMarker = (id) => {
    origRemoveMarker(id);
    if (activeSlideIdRef.current) {
      useTacticalUnifiedStore
        .getState()
        .removePlayer(activeSlideIdRef.current, id);
    }
  };

  const origUpdateArrow = store.getState().updateArrow;
  store.getState().updateArrow = (id, patch) => {
    origUpdateArrow(id, patch);
    if (activeSlideIdRef.current) {
      useTacticalUnifiedStore
        .getState()
        .updateArrow(activeSlideIdRef.current, id, patch);
    }
  };

  const origRemoveArrow = store.getState().removeArrow;
  store.getState().removeArrow = (id) => {
    origRemoveArrow(id);
    if (activeSlideIdRef.current) {
      useTacticalUnifiedStore
        .getState()
        .removeArrow(activeSlideIdRef.current, id);
    }
  };

  const origUpdateZone = store.getState().updateZone;
  store.getState().updateZone = (id, patch) => {
    origUpdateZone(id, patch);
    if (activeSlideIdRef.current) {
      useTacticalUnifiedStore
        .getState()
        .updateZone(activeSlideIdRef.current, id, patch);
    }
  };

  const origRemoveZone = store.getState().removeZone;
  store.getState().removeZone = (id) => {
    origRemoveZone(id);
    if (activeSlideIdRef.current) {
      useTacticalUnifiedStore
        .getState()
        .removeZone(activeSlideIdRef.current, id);
    }
  };

  const origUpdateText = store.getState().updateText;
  store.getState().updateText = (id, patch) => {
    origUpdateText(id, patch);
    if (activeSlideIdRef.current) {
      useTacticalUnifiedStore
        .getState()
        .updateText(activeSlideIdRef.current, id, patch);
    }
  };

  const origRemoveText = store.getState().removeText;
  store.getState().removeText = (id) => {
    origRemoveText(id);
    if (activeSlideIdRef.current) {
      useTacticalUnifiedStore
        .getState()
        .removeText(activeSlideIdRef.current, id);
    }
  };

  const origClearSelection = store.getState().clearSelection;
  store.getState().clearSelection = () => {
    origClearSelection();
    useTacticalUnifiedStore.getState().clearSelection();
  };

  return store;
}

function ContextHudWithAdapter({
  stageSize,
  pitchRect,
  nodesRegistryRef,
}: ContextHudProps) {
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);

  const activeSlideRef = useRef(activeSlide);
  activeSlideRef.current = activeSlide;
  const activeSlideIdRef = useRef(activeSlideId);
  activeSlideIdRef.current = activeSlideId;

  // biome-ignore lint/correctness/useExhaustiveDependencies: Initialize store once (state updates handled by useEffect)
  const storeApi = useMemo(() => {
    const store = createSyncedCanvasStore(activeSlide, activeSlideIdRef);
    store.setState({
      selectedObjects: selectedObjects.map((s) => ({
        id: s.id,
        kind: s.kind as SelectedObjectKind,
        parentPlayerId: (s as { parentPlayerId?: string }).parentPlayerId,
      })),
      selectedIds: selectedObjects.map((s) => s.id),
      activeTool,
      isHudOpen: true,
    });
    return store;
  }, []);

  // Sync TacticalUnifiedStore to CanvasStore
  useEffect(() => {
    storeApi.setState({
      selectedObjects: selectedObjects.map((s) => ({
        id: s.id,
        kind: s.kind as SelectedObjectKind,
        parentPlayerId: (s as { parentPlayerId?: string }).parentPlayerId,
      })),
      selectedIds: selectedObjects.map((s) => s.id),
      activeTool,
      isHudOpen: true,
      annotations: {
        markers: activeSlide?.players ?? [],
        arrows: activeSlide?.arrows ?? [],
        zones: activeSlide?.zones ?? [],
        texts: activeSlide?.texts ?? [],
      },
    });
  }, [storeApi, selectedObjects, activeTool, activeSlide]);

  const resolveExtraTarget = (
    selected: SelectedObject,
    offset: HudOffsetRect,
  ): HudTarget | null => {
    if (selected.kind === 'ball' && activeSlideRef.current?.ball) {
      return getBallTarget(
        activeSlideRef.current.ball,
        offset,
        nodesRegistryRef,
      );
    }
    return null;
  };

  const renderExtraHud = (selected: SelectedObject): React.ReactNode => {
    if (selected.kind === 'ball') {
      return <BallHud />;
    }
    return null;
  };

  return (
    <CanvasStoreProvider store={storeApi}>
      <CoreContextHud
        stageSize={stageSize}
        pitchRect={pitchRect}
        nodesRegistryRef={nodesRegistryRef}
        renderExtraHud={renderExtraHud}
        resolveExtraTarget={resolveExtraTarget}
      />
    </CanvasStoreProvider>
  );
}

export function ContextHud(props: ContextHudProps) {
  const storeContext = useContext(CanvasStoreContext);

  if (storeContext) {
    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      );
    return (
      <CoreContextHud
        {...props}
        renderExtraHud={(selected) =>
          selected.kind === 'ball' ? <BallHud /> : null
        }
        resolveExtraTarget={(selected, offset) => {
          if (selected.kind === 'ball' && activeSlide?.ball) {
            return getBallTarget(
              activeSlide.ball,
              offset,
              props.nodesRegistryRef,
            );
          }
          return null;
        }}
      />
    );
  }

  return <ContextHudWithAdapter {...props} />;
}
