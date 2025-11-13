'use client';

import type { FormEvent } from 'react';

import type { Match } from '@/lib/db';
import type { FormationPlayers } from '@/types/formation';
import { type FormationType } from '@/lib/formation-template';

import { PlayerSelectionModal } from './components/PlayerSelectionModal';
import { FormationSection } from './components/FormationSection';
import { BenchSection } from './components/BenchSection';
import { useSetupTabState } from './hooks/useSetupTabState';

interface SetupTabProps {
  match: Match;
  teamNameById: Map<number, string>;
  currentFormation?: FormationType;
  resolvedPlayers?: FormationPlayers;
}

export const SetupTab = ({
  match,
  teamNameById,
  currentFormation,
  resolvedPlayers,
}: SetupTabProps) => {
  const {
    canRender,
    effectiveFormation,
    homeTeamName,
    teamPlayers,
    homeFormationPlayers,
    recentlyDroppedPlayers,
    substitutePlayers,
    selection,
    selectedBenchPlayerId,
    isAssigning,
    isFormationUpdating,
    formState,
    isSubmitting,
    modalState,
    handleFormationChange,
    handleSubstituteClick,
    handlePositionClick,
    handleModalPlayerSelect,
    handleModalClearSelection,
    handleModalClose,
    handleFormChange,
    handleFormSubmit,
    resetSelection,
  } = useSetupTabState({
    match,
    teamNameById,
    currentFormation,
    resolvedPlayers,
  });

  if (!canRender) {
    return null;
  }

  const selectedPositionId =
    selection?.type === 'pitch' ? selection.positionId : null;

  const modalTitle = modalState.slot
    ? `${modalState.slot.position} の選手`
    : '選手を選択';

  const handleBackdropPointerDown = () => {
    resetSelection();
  };

  const handleModalPlayerSelectWrapper = (playerId: number) => {
    void handleModalPlayerSelect(playerId);
  };

  const handleModalClearSelectionWrapper = () => {
    void handleModalClearSelection();
  };

  const handleFormSubmitWrapper = (event: FormEvent<HTMLFormElement>) => {
    void handleFormSubmit(event);
  };

  return (
    <div className="space-y-6" onPointerDown={handleBackdropPointerDown}>
      <FormationSection
        homeTeamName={homeTeamName}
        effectiveFormation={effectiveFormation}
        selectedPositionId={selectedPositionId}
        isAssigning={isAssigning}
        isFormationUpdating={isFormationUpdating}
        formationPlayers={homeFormationPlayers}
        onFormationChange={handleFormationChange}
        onPositionClick={handlePositionClick}
      />

      <BenchSection
        recentlyDroppedPlayers={recentlyDroppedPlayers}
        substitutePlayers={substitutePlayers}
        selectedBenchPlayerId={selectedBenchPlayerId}
        onSubstituteSelect={handleSubstituteClick}
        isAssigning={isAssigning}
        isFormationUpdating={isFormationUpdating}
      />

      <PlayerSelectionModal
        isOpen={modalState.isOpen}
        onClose={handleModalClose}
        title={modalTitle}
        positionLabel={modalState.slot?.position}
        currentPlayerLabel={modalState.currentPlayerLabel}
        selectedPlayerId={modalState.selectedPlayerId}
        players={teamPlayers}
        formState={formState}
        isSubmitting={isSubmitting}
        isAssigning={isAssigning}
        onFormChange={handleFormChange}
        onFormSubmit={handleFormSubmitWrapper}
        onPlayerSelect={handleModalPlayerSelectWrapper}
        onClearSelection={handleModalClearSelectionWrapper}
        initialGroupKey={modalState.initialGroupKey}
      />
    </div>
  );
};
