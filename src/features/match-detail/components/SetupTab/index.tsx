'use client';

import type React from 'react';
import type { FormEvent } from 'react';

import type { Match } from '@/lib/db';
import type { FormationPlayers } from '@/types/formation';
import { type FormationType } from '@/lib/formation-template';
import { PlayerSelectionModal } from './components/PlayerSelectionModal';
import { FormationSection } from './components/FormationSection';
import { AssignSubstitutionModal } from './components/AssignSubstitutionModal';
import { useSetupTabState, type AssignModalContext } from './hooks/useSetupTabState';

interface SetupTabProps {
  match: Match;
  teamNameById: Map<number, string>;
  currentFormation?: FormationType;
  resolvedPlayers?: FormationPlayers;
  tempSlotIdMap: Map<number, string>;
  setTempSlotIdMap: React.Dispatch<React.SetStateAction<Map<number, string>>>;
}

export const SetupTab = ({
  match,
  teamNameById,
  currentFormation,
  resolvedPlayers,
  tempSlotIdMap,
  setTempSlotIdMap,
}: SetupTabProps) => {
  const subjectTeamId = match.subjectTeamId ?? match.team1Id;
  const {
    canRender,
    effectiveFormation,
    homeTeamName,
    teamPlayers,
    assignedPlayers,
    homeFormationPlayers,
    substitutedOutPlayers,
    benchItems,
    selectedBenchPlayerId,
    selection,
    isAssigning,
    isFormationUpdating,
    isSubstitutionMode,
    setIsSubstitutionMode,
    formState,
    isSubmitting,
    modalState,
    assignModalContext,
    setAssignModalContext,
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
    tempSlotIdMap,
    setTempSlotIdMap,
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

  const handleAssignSlot = (context: AssignModalContext) => {
    if (!context.tempSlotId && typeof context.eventId !== 'number') {
      return;
    }

    setAssignModalContext(context);
  };

  return (
    <div className="space-y-6" onPointerDown={handleBackdropPointerDown}>
      <FormationSection
        homeTeamName={homeTeamName}
        effectiveFormation={effectiveFormation}
        selectedPositionId={selectedPositionId}
        isAssigning={isAssigning}
        isFormationUpdating={isFormationUpdating}
        isSubstitutionMode={isSubstitutionMode}
        formationPlayers={homeFormationPlayers}
        benchItems={benchItems}
        selectedBenchPlayerId={selectedBenchPlayerId}
        onFormationChange={handleFormationChange}
        onPositionClick={handlePositionClick}
        onSubstitutionModeChange={setIsSubstitutionMode}
        onSubstituteSelect={handleSubstituteClick}
        onAssignSlot={handleAssignSlot}
      />

      <PlayerSelectionModal
        isOpen={modalState.isOpen}
        onClose={handleModalClose}
        title={modalTitle}
        positionLabel={modalState.slot?.position}
        currentPlayerLabel={modalState.currentPlayerLabel}
        selectedPlayerId={modalState.selectedPlayerId}
        players={teamPlayers}
        currentAssignedPlayers={assignedPlayers}
        substitutedOutPlayers={substitutedOutPlayers}
        formState={formState}
        isSubmitting={isSubmitting}
        isAssigning={isAssigning}
        onFormChange={handleFormChange}
        onFormSubmit={handleFormSubmitWrapper}
        onPlayerSelect={handleModalPlayerSelectWrapper}
        onClearSelection={handleModalClearSelectionWrapper}
        initialGroupKey={modalState.initialGroupKey}
      />

      <AssignSubstitutionModal
        isOpen={Boolean(assignModalContext)}
        tempSlotId={assignModalContext?.tempSlotId}
        eventId={assignModalContext?.eventId}
        defaultPlayerId={assignModalContext?.defaultPlayerId}
        teamId={subjectTeamId}
        matchId={match.id as number}
        substitutedOutPlayers={substitutedOutPlayers}
        onClose={() => setAssignModalContext(null)}
      />
    </div>
  );
};
