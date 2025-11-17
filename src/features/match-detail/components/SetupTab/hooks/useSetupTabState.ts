import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { nanoid } from 'nanoid';

import { toast } from '@/features/toast/toast-store';
import { migrateAssignedPlayers } from '@/features/match-detail/utils/assignedPlayers';
import { useFormationPlayers } from '@/features/match-detail/hooks/useFormationPlayers';
import { useMatchClock } from '@/features/match-detail/hooks/useMatchClock';
import { db, type Match, type Player, type TempPlayer, type Event } from '@/lib/db';
import type { FormationPlayers } from '@/types/formation';
import {
  type FormationType,
  type FormationPosition,
} from '@/lib/formation-template';
import {
  preloadSubstitutionActionIds,
  recordSubstitutionEvent,
} from '@/features/match-detail/utils/substitutionEvent';

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

type BenchGhostItem = {
  type: 'ghost';
  tempSlotId: string;
  position: string;
  count: number;
};

type BenchPlayerStatus = 'bench' | 'substituted';

type BenchPlayerItem = {
  type: 'player';
  status: BenchPlayerStatus;
  player: TempPlayer;
};

export type BenchItem = BenchGhostItem | BenchPlayerItem;

interface UseSetupTabStateParams {
  match: Match;
  teamNameById: Map<number, string>;
  currentFormation?: FormationType;
  resolvedPlayers?: FormationPlayers;
  tempSlotIdMap: Map<number, string>;
  setTempSlotIdMap: Dispatch<SetStateAction<Map<number, string>>>;
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
  assignedPlayers: Record<number, number>;
  homeFormationPlayers: FormationPlayers;
  substitutedOutPlayers: TempPlayer[];
  benchItems: BenchItem[];
  selection: SelectionState;
  selectedBenchPlayerId: number | null;
  isAssigning: boolean;
  isFormationUpdating: boolean;
  isSubstitutionMode: boolean;
  setIsSubstitutionMode: Dispatch<SetStateAction<boolean>>;
  formState: PlayerFormState;
  isSubmitting: boolean;
  modalState: ModalState;
  assignModalTempSlotId: string | null;
  setAssignModalTempSlotId: Dispatch<SetStateAction<string | null>>;
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
  tempSlotIdMap,
  setTempSlotIdMap,
}: UseSetupTabStateParams): UseSetupTabStateResult => {
  const [selection, setSelection] = useState<SelectionState>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPositionId, setModalPositionId] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isFormationUpdating, setIsFormationUpdating] = useState(false);
  const [isSubstitutionMode, setIsSubstitutionMode] = useState(false);
  const [assignModalTempSlotId, setAssignModalTempSlotId] = useState<string | null>(null);

  const { formattedTime } = useMatchClock();

  useEffect(() => {
    void preloadSubstitutionActionIds();
  }, []);

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

  const substitutedOutPlayerIds = useMemo(() => {
    const ids = (match.substitutedOutPlayerIds ?? []).filter(
      (playerId): playerId is number => typeof playerId === 'number' && Number.isFinite(playerId)
    );
    return new Set(ids);
  }, [match.substitutedOutPlayerIds]);

  const substitutedOutPlayers = useMemo(() => {
    if (substitutedOutPlayerIds.size === 0) {
      return [] as TempPlayer[];
    }

    return teamPlayers.filter(player => {
      if (typeof player.id !== 'number') {
        return false;
      }

      return substitutedOutPlayerIds.has(player.id);
    });
  }, [substitutedOutPlayerIds, teamPlayers]);

  const persistSubstitutedOutPlayerId = useCallback(
    async (playerId: number | null) => {
      if (playerId == null || typeof match.id !== 'number') {
        return;
      }

      const currentIds = Array.isArray(match.substitutedOutPlayerIds)
        ? match.substitutedOutPlayerIds
        : [];

      if (currentIds.includes(playerId)) {
        return;
      }

      const nextIds = [...currentIds, playerId];
      await db.matches.update(match.id, { substitutedOutPlayerIds: nextIds });
    },
    [match.id, match.substitutedOutPlayerIds]
  );

  const rawUnassignedSubstitutedOutEvents = useLiveQuery<Event[][]>(
    async () => {
      if (typeof match.id !== 'number') {
        return [];
      }

      const events = await db.events
        .where('matchId')
        .equals(match.id)
        .filter(event => event.playerId === null && event.tempSlotId != null)
        .toArray();

      const grouped = new Map<string, Event[]>();

      events.forEach(event => {
        if (!event.tempSlotId) {
          return;
        }

        const current = grouped.get(event.tempSlotId) ?? [];
        current.push(event);
        grouped.set(event.tempSlotId, current);
      });

      return Array.from(grouped.values());
    },
    [match.id]
  );

  const unassignedSubstitutedOutEvents = useMemo(
    () => rawUnassignedSubstitutedOutEvents ?? [],
    [rawUnassignedSubstitutedOutEvents]
  );

  const benchItems = useMemo<BenchItem[]>(() => {
    const ghostItems = unassignedSubstitutedOutEvents
      .map(eventGroup => {
        const representative = eventGroup[0];
        if (!representative?.tempSlotId) {
          return null;
        }

        return {
          type: 'ghost',
          tempSlotId: representative.tempSlotId,
          position: representative.positionName ?? '未設定',
          count: eventGroup.length,
        } satisfies BenchGhostItem;
      })
      .filter((item): item is BenchGhostItem => item !== null);

    const substitutedItems = substitutedOutPlayers.reduce<BenchPlayerItem[]>
      ((acc, player) => {
        if (typeof player.id !== 'number') {
          return acc;
        }

        acc.push({
          type: 'player',
          status: 'substituted',
          player,
        });

        return acc;
      }, []);

    return [...ghostItems, ...substitutedItems];
  }, [substitutedOutPlayers, unassignedSubstitutedOutEvents]);

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

  const selectedBenchPlayerId =
    selection?.type === 'list' ? selection.playerId : null;

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

      const currentPlayerInSlot = assignedPlayers[modalPositionId];
      const outgoingPlayer = teamPlayers.find(candidate => {
        if (typeof candidate.id !== 'number') {
          return false;
        }

        return candidate.id === currentPlayerInSlot;
      });

      const newPlayer = teamPlayers.find(
        candidate => typeof candidate.id === 'number' && candidate.id === playerId
      );

      setIsAssigning(true);
      try {
        await assignPlayer(modalPositionId, playerId);

        if (isSubstitutionMode) {
          let tempSlotIdA =
            modalPositionId != null ? tempSlotIdMap.get(modalPositionId) ?? null : null;

          if (
            outgoingPlayer == null &&
            tempSlotIdA == null &&
            modalPositionId != null
          ) {
            const generatedId = nanoid(8);
            tempSlotIdA = generatedId;
            setTempSlotIdMap(prev => {
              const next = new Map(prev);
              next.set(modalPositionId, generatedId);
              return next;
            });
          }
          const outgoingPlayerId =
            outgoingPlayer && typeof outgoingPlayer.id === 'number'
              ? outgoingPlayer.id
              : null;

          await recordSubstitutionEvent(
            match.id,
            outgoingPlayerId,
            tempSlotIdA,
            formattedTime,
            modalSlot?.position,
            'out'
          );
          await persistSubstitutedOutPlayerId(outgoingPlayerId);

          if (newPlayer) {
            await recordSubstitutionEvent(
              match.id,
              typeof newPlayer.id === 'number' ? newPlayer.id : null,
              null,
              formattedTime,
              modalSlot?.position,
              'in'
            );
          }
        }

        toast.success(
          isSubstitutionMode ? '選手を交代しました' : 'スタメンを設定しました'
        );
        resetSelection();
        handleModalClose();
      } catch (error) {
        console.error('Failed to assign player', error);
        toast.error('選手の割り当てに失敗しました');
      } finally {
        setIsAssigning(false);
      }
    },
    [
      assignPlayer,
      formattedTime,
      handleModalClose,
      isSubstitutionMode,
      match.id,
      modalPositionId,
      modalSlot,
      resetSelection,
      persistSubstitutedOutPlayerId,
      assignedPlayers,
      teamPlayers,
      setTempSlotIdMap,
      tempSlotIdMap,
    ]
  );

  const handleModalClearSelection = useCallback(async () => {
    if (modalPositionId == null) {
      return;
    }

    setIsAssigning(true);
    try {
      await clearPlayer(modalPositionId);

      if (!isSubstitutionMode) {
        toast.success('割り当てをクリアしました');
        return;
      }

      let tempSlotIdA =
        modalPositionId != null ? tempSlotIdMap.get(modalPositionId) ?? null : null;

      if (
        modalAssignedPlayer == null &&
        tempSlotIdA == null &&
        modalPositionId != null
      ) {
        const generatedId = nanoid(8);
        tempSlotIdA = generatedId;
        setTempSlotIdMap(prev => {
          const next = new Map(prev);
          next.set(modalPositionId, generatedId);
          return next;
        });
      }

      const outgoingPlayerId =
        modalAssignedPlayer && typeof modalAssignedPlayer.id === 'number'
          ? modalAssignedPlayer.id
          : null;

      await recordSubstitutionEvent(
        match.id,
        outgoingPlayerId,
        tempSlotIdA,
        formattedTime,
        modalSlot?.position,
        'out'
      );
      await persistSubstitutedOutPlayerId(outgoingPlayerId);

      toast.success('選手を交代しました');
    } catch (error) {
      console.error('Failed to clear assignment', error);
      toast.error('割り当てのクリアに失敗しました');
    } finally {
      setIsAssigning(false);
    }
  }, [
    clearPlayer,
    formattedTime,
    isSubstitutionMode,
    match.id,
    modalAssignedPlayer,
    modalPositionId,
    modalSlot,
    persistSubstitutedOutPlayerId,
    setTempSlotIdMap,
    tempSlotIdMap,
  ]);

  const handlePositionClick = useCallback(
    async (positionId: number, player?: Player) => {
      if (isAssigning || isFormationUpdating) {
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

      if (selection?.type === 'list') {
        const benchPlayerId = selection.playerId;
        if (typeof benchPlayerId !== 'number') {
          resetSelection();
          return;
        }

        const currentPlayerInSlot = assignedPlayers[positionId];
        const outgoingPlayer = teamPlayers.find(candidate => {
          if (typeof candidate.id !== 'number') {
            return false;
          }

          return candidate.id === currentPlayerInSlot;
        });

        setIsAssigning(true);
        try {
          await assignPlayer(positionId, benchPlayerId);

          if (isSubstitutionMode) {
            const targetSlot = formationSlots.find(slot => slot.id === positionId);
            let tempSlotIdA = tempSlotIdMap.get(positionId) ?? null;

            if (outgoingPlayer == null && tempSlotIdA == null) {
              const generatedId = nanoid(8);
              tempSlotIdA = generatedId;
              setTempSlotIdMap(prev => {
                const next = new Map(prev);
                next.set(positionId, generatedId);
                return next;
              });
            }

            const outgoingPlayerId =
              outgoingPlayer && typeof outgoingPlayer.id === 'number'
                ? outgoingPlayer.id
                : null;

            await recordSubstitutionEvent(
              match.id,
              outgoingPlayerId,
              tempSlotIdA,
              formattedTime,
              targetSlot?.position,
              'out'
            );
            await persistSubstitutedOutPlayerId(outgoingPlayerId);

            const newPlayer = teamPlayers.find(
              candidate =>
                typeof candidate.id === 'number' && candidate.id === benchPlayerId
            );

            if (newPlayer) {
              await recordSubstitutionEvent(
                match.id,
                typeof newPlayer.id === 'number' ? newPlayer.id : null,
                null,
                formattedTime,
                targetSlot?.position,
                'in'
              );
            }
          }

          toast.success(
            isSubstitutionMode ? '選手を交代しました' : 'スタメンを設定しました'
          );
          resetSelection();
        } catch (error) {
          console.error('Failed to assign player', error);
          toast.error('選手の割り当てに失敗しました');
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
      formattedTime,
      formationSlots,
      getAssignedPlayerId,
      isAssigning,
      isFormationUpdating,
      isSubstitutionMode,
      match.id,
      openPlayerModal,
      resetSelection,
      selection,
      swapPlayers,
      teamPlayers,
      persistSubstitutedOutPlayerId,
      setTempSlotIdMap,
      tempSlotIdMap,
      assignedPlayers,
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
    assignedPlayers,
    homeFormationPlayers,
    substitutedOutPlayers,
    benchItems,
    selection,
    selectedBenchPlayerId,
    isAssigning,
    isFormationUpdating,
    isSubstitutionMode,
    setIsSubstitutionMode,
    formState,
    isSubmitting,
    modalState,
    assignModalTempSlotId,
    setAssignModalTempSlotId,
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
