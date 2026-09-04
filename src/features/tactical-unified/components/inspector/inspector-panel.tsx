'use client';

/**
 * inspector-panel.tsx
 * Right inspector — Selected Object Properties & Slide Settings
 * Handles: Slide Settings (when unselected), Player, Arrow, Zone, Text, Ball
 */

import { useEffect, useRef } from 'react';
import {
  type SelectedObject,
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import type { Player } from '@/lib/types/tactical-unified';
import { ArrowInspector } from './arrow-inspector';
import { BallInspector } from './ball-inspector';
import { InspectorHeader } from './inspector-shared-controls';
import { MarkerConnectorSection } from './marker-connector-section';
import { MarkerSpotlightSection } from './marker-spotlight-section';
import { MarkerVisionSection } from './marker-vision-section';
import { MultiPlayerInspector, PlayerInspector } from './player-inspector';
import { SlideSettingsInspector } from './slide-inspector';
import { TextInspector } from './text-inspector';
import { ZoneInspector } from './zone-inspector';

export function InspectorPanel() {
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const clearSelection = useTacticalUnifiedStore((s) => s.clearSelection);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const slides = useTacticalUnifiedStore((s) => s.project.slides);
  const updatePlayer = useTacticalUnifiedStore((s) => s.updatePlayer);
  const addArrow = useTacticalUnifiedStore((s) => s.addArrow);
  const updateArrow = useTacticalUnifiedStore((s) => s.updateArrow);
  const updateZone = useTacticalUnifiedStore((s) => s.updateZone);
  const updateText = useTacticalUnifiedStore((s) => s.updateText);
  const removePlayer = useTacticalUnifiedStore((s) => s.removePlayer);
  const removeArrow = useTacticalUnifiedStore((s) => s.removeArrow);
  const removeZone = useTacticalUnifiedStore((s) => s.removeZone);
  const removeText = useTacticalUnifiedStore((s) => s.removeText);
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
      return (
        <div className="flex flex-col h-full">
          <InspectorHeader
            title={`Multiple Players (${selectedPlayers.length})`}
            onClose={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
            onDeselect={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
          <MultiPlayerInspector
            players={selectedPlayers}
            slideId={activeSlideId}
            updatePlayer={updatePlayer}
            removePlayer={removePlayer}
            clearSelection={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
        </div>
      );
    }
  }

  // ── Player Selected (または直近選択された Player) ─────────────────────
  if (effectiveSingle?.kind === 'player') {
    const player = activeSlide?.players.find(
      (p) => p.id === effectiveSingle.id,
    );
    if (player && activeSlide) {
      return (
        <div className="flex flex-col h-full">
          <InspectorHeader
            title={player.style.markerType === 'ring' ? 'Ring' : 'Player'}
            onClose={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
            onDeselect={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
          <PlayerInspector
            player={player}
            allPlayers={activeSlide.players}
            slideId={activeSlideId}
            updatePlayer={updatePlayer}
            addArrow={addArrow}
            onRemove={() => {
              removePlayer(activeSlideId, player.id);
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
        </div>
      );
    }
  }

  // ── Arrow Selected (または直近選択された Arrow) ──────────────────────
  if (effectiveSingle?.kind === 'arrow') {
    const arrow = activeSlide?.arrows.find((a) => a.id === effectiveSingle.id);
    if (arrow && activeSlide) {
      return (
        <div className="flex flex-col h-full">
          <InspectorHeader
            title="Arrow & Line"
            onClose={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
            onDeselect={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
          <ArrowInspector
            arrow={arrow}
            slideId={activeSlideId}
            updateArrow={updateArrow}
            onRemove={() => {
              removeArrow(activeSlideId, arrow.id);
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
        </div>
      );
    }
  }

  // ── Zone Selected (または直近選択された Zone) ────────────────────────
  if (effectiveSingle?.kind === 'zone') {
    const zone = activeSlide?.zones.find((z) => z.id === effectiveSingle.id);
    if (zone && activeSlide) {
      return (
        <div className="flex flex-col h-full">
          <InspectorHeader
            title="Zone"
            onClose={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
            onDeselect={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
          <ZoneInspector
            zone={zone}
            slideId={activeSlideId}
            updateZone={updateZone}
            onRemove={() => {
              removeZone(activeSlideId, zone.id);
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
        </div>
      );
    }
  }

  // ── Text Selected (または直近選択された Text) ────────────────────────
  if (effectiveSingle?.kind === 'text') {
    const textObj = activeSlide?.texts.find((t) => t.id === effectiveSingle.id);
    if (textObj && activeSlide) {
      return (
        <div className="flex flex-col h-full">
          <InspectorHeader
            title="Text"
            onClose={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
            onDeselect={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
          <TextInspector
            text={textObj}
            slideId={activeSlideId}
            updateText={updateText}
            onRemove={() => {
              removeText(activeSlideId, textObj.id);
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
        </div>
      );
    }
  }

  // ── Ball Selected (または直近選択された Ball) ────────────────────────
  if (effectiveSingle?.kind === 'ball' && activeSlide) {
    return (
      <div className="flex flex-col h-full">
        <InspectorHeader
          title="Ball"
          onClose={() => {
            lastSelectedRef.current = null;
            clearSelection();
          }}
          onDeselect={() => {
            lastSelectedRef.current = null;
            clearSelection();
          }}
        />
        <BallInspector slideId={activeSlideId} />
      </div>
    );
  }

  // ── Attached Elements (Vision Cone, Connect Line, Focus) ────────────────────────
  if (
    (effectiveSingle?.kind === 'vision-cone' ||
      effectiveSingle?.kind === 'connect-line' ||
      effectiveSingle?.kind === 'focus') &&
    effectiveSingle.parentPlayerId &&
    activeSlide
  ) {
    const player = activeSlide.players.find(
      (p) => p.id === effectiveSingle.parentPlayerId,
    );
    if (player) {
      return (
        <div className="flex flex-col h-full">
          <InspectorHeader
            title={
              effectiveSingle.kind === 'vision-cone'
                ? 'Vision Cone'
                : effectiveSingle.kind === 'connect-line'
                  ? 'Connect Line'
                  : 'Focus Spotlight'
            }
            onClose={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
            onDeselect={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
          <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-slate-200 custom-scrollbar">
            {effectiveSingle.kind === 'vision-cone' && (
              <MarkerVisionSection
                player={player}
                slideId={activeSlideId}
                updatePlayer={updatePlayer}
              />
            )}
            {effectiveSingle.kind === 'connect-line' && (
              <MarkerConnectorSection
                player={player}
                allPlayers={activeSlide.players}
                slideId={activeSlideId}
                updatePlayer={updatePlayer}
              />
            )}
            {effectiveSingle.kind === 'focus' && (
              <MarkerSpotlightSection
                player={player}
                slideId={activeSlideId}
                updatePlayer={updatePlayer}
              />
            )}
          </div>
        </div>
      );
    }
  }

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
