'use client';

/**
 * context-hud.tsx
 * Web-layer wrapper around core/components/ContextHud.
 * Bridges CanvasStoreContext with useTacticalUnifiedStore and provides BallHud plugin.
 */

import type React from 'react';
import { useContext, useMemo } from 'react';
import { createTacticalCanvasStoreAdapter } from '@/features/tactical-unified/adapters/tactical-canvas-store-adapter';
import {
  type CanvasNodesRegistry,
  CanvasStoreContext,
  CanvasStoreProvider,
  ContextHud as CoreContextHud,
  type HudOffsetRect,
  type HudTarget,
  type SelectedObject,
} from '@/features/tactical-unified/core';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { BallHud } from './ball-hud';
import { getBallTarget } from './hud-marker-targets';

export interface ContextHudProps {
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

function ContextHudContent(props: ContextHudProps) {
  const activeSlide = useTacticalUnifiedStore
    .getState()
    .project.slides.find(
      (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
    );

  const resolveExtraTarget = (
    selected: SelectedObject,
    offset: HudOffsetRect,
  ): HudTarget | null => {
    if (selected.kind === 'ball' && activeSlide?.ball) {
      return getBallTarget(activeSlide.ball, offset, props.nodesRegistryRef);
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
    <CoreContextHud
      {...props}
      renderExtraHud={renderExtraHud}
      resolveExtraTarget={resolveExtraTarget}
    />
  );
}

function ContextHudWithFallback(props: ContextHudProps) {
  const fallbackStore = useMemo(
    () => createTacticalCanvasStoreAdapter(useTacticalUnifiedStore),
    [],
  );

  return (
    <CanvasStoreProvider store={fallbackStore}>
      <ContextHudContent {...props} />
    </CanvasStoreProvider>
  );
}

export function ContextHud(props: ContextHudProps) {
  const storeContext = useContext(CanvasStoreContext);

  if (storeContext) {
    return <ContextHudContent {...props} />;
  }

  return <ContextHudWithFallback {...props} />;
}
