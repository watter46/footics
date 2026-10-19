'use client';

/**
 * inspector-panel.tsx
 * Right inspector — Selected Object Properties & Slide Settings
 * Handles: Slide Settings (when unselected), Player, Arrow, Zone, Text, Ball, Attached Elements
 */

import { useEffect, useRef } from 'react';
import {
  type SelectedObject,
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import type { Player } from '@/lib/types/tactical-unified';
import { inspectorRegistry } from './inspector-registry';
import { InspectorHeader } from './inspector-shared-controls';
import { MultiPlayerInspector } from './multi-player-inspector';
import { SlideSettingsInspector } from './slide-inspector';

export function InspectorPanel() {
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const clearSelection = useTacticalUnifiedStore((s) => s.clearSelection);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const slides = useTacticalUnifiedStore((s) => s.project.slides);
  const updatePlayer = useTacticalUnifiedStore((s) => s.updatePlayer);
  const removePlayer = useTacticalUnifiedStore((s) => s.removePlayer);
  const updateSlideTransition = useTacticalUnifiedStore(
    (s) => s.updateSlideTransition,
  );
  const deleteSlide = useTacticalUnifiedStore((s) => s.deleteSlide);
  const setRightPanelTab = useTacticalUnifiedStore((s) => s.setRightPanelTab);
  const project = useTacticalUnifiedStore((s) => s.project);
  const setBackgroundType = useTacticalUnifiedStore((s) => s.setBackgroundType);

  const single = selectedObjects.length === 1 ? selectedObjects[0] : null;

  // ── 直近で選択されたオブジェクトの保持 (パネル外クリック時も直近のプロパティを保持) ──
  const lastSelectedRef = useRef<SelectedObject | null>(null);

  useEffect(() => {
    if (single) {
      lastSelectedRef.current = single;
    }
  }, [single]);

  // 現在選択中のオブジェクト、または直近で選択されていたオブジェクト
  const effectiveSingle = single || lastSelectedRef.current;

  // ── Multiple Players Selected ─────────────────────────────────────────
  const selectedPlayerObjects = selectedObjects.filter(
    (o) => o.kind === 'player',
  );
  if (selectedObjects.length > 1 && selectedPlayerObjects.length > 0) {
    const selectedPlayers = selectedPlayerObjects
      .map((o) => activeSlide?.players.find((p) => p.id === o.id))
      .filter((p): p is Player => Boolean(p));

    if (selectedPlayers.length > 0) {
      const handleDeselect = () => {
        lastSelectedRef.current = null;
        clearSelection();
      };

      return (
        <div className="flex flex-col h-full">
          <InspectorHeader
            title={`Multiple Players (${selectedPlayers.length})`}
            onClose={handleDeselect}
            onDeselect={handleDeselect}
          />
          <MultiPlayerInspector
            players={selectedPlayers}
            slideId={activeSlideId}
            updatePlayer={updatePlayer}
            removePlayer={removePlayer}
            clearSelection={handleDeselect}
          />
        </div>
      );
    }
  }

  // ── Single Object Selected (Registry-driven dispatch) ──────────────────
  if (effectiveSingle && activeSlide) {
    const entry = inspectorRegistry[effectiveSingle.kind];
    if (entry) {
      const Component = entry.component;
      const title = entry.getTitle(effectiveSingle, activeSlide);
      const handleDeselect = () => {
        lastSelectedRef.current = null;
        clearSelection();
      };

      return (
        <div className="flex flex-col h-full">
          <InspectorHeader
            title={title}
            onClose={handleDeselect}
            onDeselect={handleDeselect}
          />
          <Component
            selected={effectiveSingle}
            slideId={activeSlideId}
            activeSlide={activeSlide}
            onDeselect={handleDeselect}
          />
        </div>
      );
    }
  }

  // ── Slide Settings (Default fallback) ──────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <InspectorHeader
        title="Slide Settings"
        onClose={() => {
          setRightPanelTab('formation');
        }}
      />
      <SlideSettingsInspector
        project={project}
        activeSlide={activeSlide}
        slidesCount={slides.length}
        setBackgroundType={setBackgroundType}
        updateSlideTransition={updateSlideTransition}
        deleteSlide={deleteSlide}
      />
    </div>
  );
}
