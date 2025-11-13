import {
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import { toast } from '@/features/toast/toast-store';
import { migrateAssignedPlayers } from '@/features/match-detail/utils/assignedPlayers';
import { useFormationPlayers } from '@/features/match-detail/hooks/useFormationPlayers';
import { db, type Match, type Player, type TempPlayer } from '@/lib/db';
import type { FormationPlayers } from '@/types/formation';
import {
  type FormationType,
  type FormationPosition,
} from '@/lib/formation-template';

import { useFormationAssignments } from './useFormationAssignments';
import { useTeamPlayers } from './useTeamPlayers';
import {
  usePlayerRegistration,
  type PlayerFormState,
} from './usePlayerRegistration';
import { formatPlayerLabel } from '../utils/playerLabel';

const DEFAULT_FORMATION: FormationType = '4-2-3-1';

export type SelectionState =
  | { type: 'pitch'; positionId: number }
  | { type: 'list'; playerId: number }
  | null;

interface UseSetupTabStateParams {
  match: Match;
  teamNameById: Map<number, string>;
  currentFormation?: FormationType;
  resolvedPlayers?: FormationPlayers;
}

interface ModalState {
  isOpen: boolean;
  slot?: FormationPosition;
  selectedPlayerId?: number;
  currentPlayerLabel?: string;
  initialGroupKey: string | null;
}

interface UseSetupTabStateResult {
  canRender: boolean;
  effectiveFormation: FormationType;
  homeTeamName: string;
  teamPlayers: TempPlayer[];
  homeFormationPlayers: FormationPlayers;
  recentlyDroppedPlayers: TempPlayer[];
  substitutePlayers: TempPlayer[];
  selection: SelectionState;
  selectedBenchPlayerId: number | null;
  isAssigning: boolean;
  isFormationUpdating: boolean;
  formState: PlayerFormState;
  isSubmitting: boolean;
  modalState: ModalState;
  handleFormationChange: (event: ChangeEvent<HTMLSelectElement>) => Promise<void>;
  handleSubstituteClick: (playerId: number, isSelected: boolean) => void;
  handlePositionClick: (positionId: number, player?: Player) => Promise<void>;
  handleModalPlayerSelect: (playerId: number) => Promise<void>;
  handleModalClearSelection: () => Promise<void>;
  handleModalClose: () => void;
  handleFormChange: (field: keyof PlayerFormState, value: string) => void;
  handleFormSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  resetSelection: () => void;
}

export const useSetupTabState = ({
  match,
  teamNameById,
  currentFormation,
  resolvedPlayers,
}: UseSetupTabStateParams): UseSetupTabStateResult => {
  const [selection, setSelection] = useState<SelectionState>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPositionId, setModalPositionId] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isFormationUpdating, setIsFormationUpdating] = useState(false);
  const [recentlyDroppedPlayerIds, setRecentlyDroppedPlayerIds] = useState<
    Set<number>
  >(() => new Set());

  const effectiveFormation = currentFormation ?? DEFAULT_FORMATION;

  const teamPlayers = useTeamPlayers(match.team1Id);

  const { formState, isSubmitting, handleFormChange, handleFormSubmit } =
    usePlayerRegistration({ teamId: match.team1Id });

  const { formationSlots, homeFormationPlayers } = useFormationPlayers({
    match,
    formation: effectiveFormation,
    resolvedPlayers,
  });

  const {
    assignedPlayers,
    getAssignedPlayer,
    getAssignedPlayerId,
    assignPlayer,
    clearPlayer,
    swapPlayers,
    setAssignedPlayersState,
  } = useFormationAssignments({
    match,
    formationSlots,
    resolvedPlayers,
  });

  const assignedPlayerIds = useMemo(() => {
    const validIds = Object.values(assignedPlayers).filter(
      (id): id is number => typeof id === 'number' && Number.isFinite(id)
    );
    return new Set(validIds);
  }, [assignedPlayers]);

  const recentlyDroppedPlayers = useMemo(() => {
    if (recentlyDroppedPlayerIds.size === 0) {
      return [] as TempPlayer[];
    }

    return teamPlayers.filter(player => {
      if (typeof player.id !== 'number') {
        return false;
      }

      return recentlyDroppedPlayerIds.has(player.id);
    });
  }, [recentlyDroppedPlayerIds, teamPlayers]);

  const substitutePlayers = useMemo(() => {
    return teamPlayers.filter(player => {
      if (typeof player.id !== 'number') {
        return false;
      }

      if (recentlyDroppedPlayerIds.has(player.id)) {
        return false;
      }

      return !assignedPlayerIds.has(player.id);
    });
  }, [assignedPlayerIds, recentlyDroppedPlayerIds, teamPlayers]);

  const homeTeamName = useMemo(
    () => teamNameById.get(match.team1Id) ?? `Team #${match.team1Id}`,
    [match.team1Id, teamNameById]
  );

  const modalSlot = useMemo(() => {
    if (modalPositionId == null) {
      return undefined;
    }

    return formationSlots.find(slot => slot.id === modalPositionId);
  }, [formationSlots, modalPositionId]);

  const modalSelectedPlayerId = useMemo(() => {
    if (modalPositionId == null) {
      return undefined;
    }

    return getAssignedPlayerId(modalPositionId);
  }, [getAssignedPlayerId, modalPositionId]);

  const modalAssignedPlayer = useMemo(() => {
    if (modalPositionId == null) {
      return undefined;
    }

    return getAssignedPlayer(modalPositionId);
  }, [getAssignedPlayer, modalPositionId]);

  const modalCurrentPlayerLabel = useMemo(
    () => formatPlayerLabel(modalAssignedPlayer),
    [modalAssignedPlayer]
  );

  const selectedBenchPlayerId = selection?.type === 'list' ? selection.playerId : null;

  const resetSelection = useCallback(() => {
    setSelection(null);
  }, []);

  const openPlayerModal = useCallback((positionId: number) => {
    setModalPositionId(positionId);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setModalPositionId(null);
    resetSelection();
  }, [resetSelection]);

  const handleFormationChange = useCallback(
    async (event: ChangeEvent<HTMLSelectElement>) => {
      const nextFormation = event.target.value as FormationType;

      if (nextFormation === effectiveFormation) {
        return;
      }

      if (typeof match.id !== 'number') {
        toast.error('試合情報がまだ保存されていません');
        return;
      }

      const oldPlayerIds = new Set(
        Object.values(assignedPlayers).filter(
          (id): id is number => typeof id === 'number' && Number.isFinite(id)
        )
      );

      const migratedAssignments = migrateAssignedPlayers(
        assignedPlayers,
        effectiveFormation,
        nextFormation
      );

      setIsFormationUpdating(true);
      handleModalClose();

      try {
        await db.matches.update(match.id, {
          currentFormation: nextFormation,
          assignedPlayers: migratedAssignments,
        });

        setAssignedPlayersState(migratedAssignments);

        const newPlayerIds = new Set(
          Object.values(migratedAssignments).filter(
            (id): id is number =>
              typeof id === 'number' && Number.isFinite(id)
          )
        );

        const droppedIds = new Set(
          [...oldPlayerIds].filter(id => !newPlayerIds.has(id))
        );

        setRecentlyDroppedPlayerIds(droppedIds);
        resetSelection();
        toast.success('フォーメーションを変更しました');
      } catch (error) {
        console.error('Failed to update formation', error);
        toast.error('フォーメーションの変更に失敗しました');
      } finally {
        setIsFormationUpdating(false);
      }
    },
    [
      assignedPlayers,
      effectiveFormation,
      handleModalClose,
      match.id,
      resetSelection,
      setAssignedPlayersState,
    ]
  );

  const handleSubstituteClick = useCallback(
    (playerId: number, isSelected: boolean) => {
      if (isAssigning || isFormationUpdating) {
        return;
      }

      if (isSelected) {
        resetSelection();
        return;
      }

      setSelection({ type: 'list', playerId });
    },
    [isAssigning, isFormationUpdating, resetSelection]
  );

  const handleModalPlayerSelect = useCallback(
    async (playerId: number) => {
      if (modalPositionId == null) {
        return;
      }

      setIsAssigning(true);
      try {
        await assignPlayer(modalPositionId, playerId);
        setRecentlyDroppedPlayerIds(prev => {
          if (prev.size === 0) {
            return prev;
          }
          const next = new Set(prev);
          next.delete(playerId);
          return next;
        });
        toast.success('選手を割り当てました');
        resetSelection();
        handleModalClose();
      } catch (error) {
        console.error('Failed to assign player', error);
        toast.error('選手の割り当てに失敗しました');
      } finally {
        setIsAssigning(false);
      }
    },
    [assignPlayer, handleModalClose, modalPositionId, resetSelection]
  );

  const handleModalClearSelection = useCallback(async () => {
    if (modalPositionId == null) {
      return;
    }

    setIsAssigning(true);
    try {
      await clearPlayer(modalPositionId);
      toast.success('割り当てをクリアしました');
    } catch (error) {
      console.error('Failed to clear assignment', error);
      toast.error('割り当てのクリアに失敗しました');
    } finally {
      setIsAssigning(false);
    }
  }, [clearPlayer, modalPositionId]);

  const handlePositionClick = useCallback(
    async (positionId: number, player?: Player) => {
      if (isAssigning || isFormationUpdating) {
        return;
      }

      if (selection?.type === 'list') {
        const benchPlayerId = selection.playerId;
        if (typeof benchPlayerId !== 'number') {
          resetSelection();
          return;
        }

        setIsAssigning(true);
        try {
          await assignPlayer(positionId, benchPlayerId);
          setRecentlyDroppedPlayerIds(prev => {
            if (prev.size === 0) {
              return prev;
            }
            const next = new Set(prev);
            next.delete(benchPlayerId);
            return next;
          });
          toast.success('選手を割り当てました');
          resetSelection();
        } catch (error) {
          console.error('Failed to assign player', error);
          toast.error('選手の割り当てに失敗しました');
        } finally {
          setIsAssigning(false);
        }
        return;
      }

      if (selection?.type === 'pitch') {
        const sourcePositionId = selection.positionId;
        if (sourcePositionId === positionId) {
          resetSelection();
          openPlayerModal(positionId);
          return;
        }

        const sourcePlayerId = getAssignedPlayerId(sourcePositionId);
        const targetPlayerId = getAssignedPlayerId(positionId);

        if (sourcePlayerId === undefined && targetPlayerId === undefined) {
          resetSelection();
          return;
        }

        setIsAssigning(true);
        try {
          await swapPlayers(sourcePositionId, positionId);
          const swappedBoth =
            sourcePlayerId !== undefined && targetPlayerId !== undefined;
          toast.success(
            swappedBoth ? 'ポジションを入れ替えました' : 'ポジションを移動しました'
          );
          resetSelection();
        } catch (error) {
          console.error('Failed to swap players', error);
          toast.error('ポジションの移動に失敗しました');
        } finally {
          setIsAssigning(false);
        }
        return;
      }

      const hasAssignedPlayer = Boolean(player && typeof player.id === 'number');

      if (hasAssignedPlayer) {
        setSelection({ type: 'pitch', positionId });
        return;
      }

      openPlayerModal(positionId);
    },
    [
      assignPlayer,
      getAssignedPlayerId,
      isAssigning,
      isFormationUpdating,
      openPlayerModal,
      resetSelection,
      selection,
      swapPlayers,
    ]
  );

  const modalState: ModalState = {
    isOpen: isModalOpen,
    slot: modalSlot,
    selectedPlayerId: modalSelectedPlayerId,
    currentPlayerLabel: modalCurrentPlayerLabel,
    initialGroupKey: modalSlot?.group ?? null,
  };

  return {
    canRender: typeof match.id === 'number',
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
  };
};
