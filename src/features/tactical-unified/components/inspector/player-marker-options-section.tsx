'use client';

import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { MarkerAppearanceSection } from './marker-appearance-section';
import { MarkerArrowSection } from './marker-arrow-section';
import { MarkerBadgeSection } from './marker-badge-section';
import { MarkerConnectorSection } from './marker-connector-section';
import type { PlayerMarkerOptionsSectionProps } from './marker-options-types';
import { MarkerSpotlightSection } from './marker-spotlight-section';
import { MarkerTabBar } from './marker-tab-bar';
import { MarkerVisionSection } from './marker-vision-section';

export type { PlayerMarkerOptionsSectionProps } from './marker-options-types';

export function PlayerMarkerOptionsSection({
  player,
  allPlayers,
  slideId,
  updatePlayer,
  addArrow,
  newBadgeText,
  setNewBadgeText,
}: PlayerMarkerOptionsSectionProps) {
  const currentTab =
    useTacticalUnifiedStore((s) => s.activeMarkerOptionTab) || 'vision';
  const setActiveMarkerOptionTab = useTacticalUnifiedStore(
    (s) => s.setActiveMarkerOptionTab,
  );

  return (
    <>
      <MarkerTabBar
        currentTab={currentTab}
        onSelectTab={setActiveMarkerOptionTab}
        player={player}
        slideId={slideId}
        updatePlayer={updatePlayer}
        addArrow={addArrow}
      />
      {currentTab === 'vision' && (
        <MarkerVisionSection
          player={player}
          slideId={slideId}
          updatePlayer={updatePlayer}
        />
      )}
      {currentTab === 'connect' && (
        <MarkerConnectorSection
          player={player}
          allPlayers={allPlayers}
          slideId={slideId}
          updatePlayer={updatePlayer}
        />
      )}
      {(currentTab === 'arrow_solid' || currentTab === 'arrow_dash') && (
        <MarkerArrowSection
          currentTab={currentTab}
          player={player}
          slideId={slideId}
          addArrow={addArrow}
        />
      )}
      {currentTab === 'focus' && (
        <MarkerSpotlightSection
          player={player}
          slideId={slideId}
          updatePlayer={updatePlayer}
        />
      )}
      {currentTab === 'basic' && (
        <div className="space-y-3.5">
          <MarkerAppearanceSection
            player={player}
            slideId={slideId}
            updatePlayer={updatePlayer}
          />
          <MarkerBadgeSection
            player={player}
            slideId={slideId}
            updatePlayer={updatePlayer}
            newBadgeText={newBadgeText}
            setNewBadgeText={setNewBadgeText}
          />
        </div>
      )}
    </>
  );
}
