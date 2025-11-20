import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { nanoid } from 'nanoid';

import { toast } from '@/features/toast/toast-store';
import { useMatchClock } from '@/features/match/hooks/useMatchClock';
import { useEventRepository } from '@/features/match/hooks/useEventRepository';
import { useMatchRepository } from '@/features/match/hooks/useMatchRepository';
import { type Match, type Player, type TempPlayer, type Event } from '@/lib/db';
import type { FormationPlayers } from '@/types/formation';
import {
  type FormationType,
  type FormationPosition,
} from '@/lib/formation-template';
import {
  preloadSubstitutionActionIds,
  recordSubstitutionEvent,
} from '@/features/match/utils/substitutionEvent';

import { useTeamRepository } from '@/features/match/hooks/useTeamRepository';
import {
  usePlayerRegistration,
} from './usePlayerRegistration';
import { formatPlayerLabel } from '../utils/playerLabel';
import { useFormationLogic } from './useFormationLogic';

const DEFAULT_FORMATION: FormationType = '4-2-3-1';
const EMPTY_SUBSTITUTION_EVENTS: Event[] = [];

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
  originalEventId?: number;
};

export type BenchItem = BenchGhostItem | BenchPlayerItem;

export type AssignModalContext = {
  tempSlotId?: string | null;
  eventId?: number | null;
  defaultPlayerId?: number | null;
};

interface UseSetupTabParams {
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

export const useSetupTab = ({
  match,
  teamNameById,
  currentFormation,
  resolvedPlayers,
  tempSlotIdMap,
  setTempSlotIdMap,
}: UseSetupTabParams) => {
  const [selection, setSelection] = useState<SelectionState>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPositionId, setModalPositionId] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isFormationUpdating, setIsFormationUpdating] = useState(false);
  const [isSubstitutionMode, setIsSubstitutionMode] = useState(false);
  const [assignModalContext, setAssignModalContext] =
    useState<AssignModalContext | null>(null);

  const { formattedTime } = useMatchClock();
  const { useSubstitutionEvents } = useEventRepository();
  const { updateMatch } = useMatchRepository();

  useEffect(() => {
    void preloadSubstitutionActionIds();
  }, []);

  const effectiveFormation = currentFormation ?? DEFAULT_FORMATION;
  const subjectTeamId = match.subjectTeamId ?? match.team1Id;

  const { useTeamPlayers } = useTeamRepository();
  const rawTeamPlayers = useTeamPlayers(subjectTeamId);
  const teamPlayers = useMemo(() => rawTeamPlayers ?? [], [rawTeamPlayers]);

  const { formState, isSubmitting, handleFormChange, handleFormSubmit } =
    usePlayerRegistration({ teamId: subjectTeamId });

  const {
    formationSlots,
    homeFormationPlayers,
    assignedPlayers,
    assignPlayer,
    clearPlayer,
    swapPlayers,
    changeFormation,
  } = useFormationLogic({
    match,
    currentFormation: effectiveFormation,
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
      await updateMatch(match.id, { substitutedOutPlayerIds: nextIds });
    },
    [match.id, match.substitutedOutPlayerIds, updateMatch]
  );

  const substitutedOutEvents = useSubstitutionEvents(match.id, subjectTeamId) ?? EMPTY_SUBSTITUTION_EVENTS;

  const teamPlayersById = useMemo(() => {
    const map = new Map<number, TempPlayer>();
    teamPlayers.forEach(player => {
      if (typeof player.id === 'number') {
        map.set(player.id, player);
      }
    });
    return map;
  }, [teamPlayers]);

  const benchItems = useMemo<BenchItem[]>(() => {
    const ghostItemsMap = new Map<string, BenchGhostItem>();
    const playerItems: BenchPlayerItem[] = [];

    substitutedOutEvents.forEach(event => {
      if (event.playerId == null) {
        if (!event.tempSlotId) {
          return;
        }

        const existing = ghostItemsMap.get(event.tempSlotId);
        if (existing) {
          existing.count += 1;
          return;
        }

        ghostItemsMap.set(event.tempSlotId, {
          type: 'ghost',
          tempSlotId: event.tempSlotId,
          position: event.positionName ?? '未設定',
          count: 1,
        });
        return;
      }

      if (typeof event.playerId !== 'number') {
        return;
      }

      const player = teamPlayersById.get(event.playerId);
      if (!player) {
        return;
      }

      playerItems.push({
        type: 'player',
        status: 'substituted',
        player,
        originalEventId: typeof event.id === 'number' ? event.id : undefined,
      });
    });

    return [...ghostItemsMap.values(), ...playerItems];
  }, [substitutedOutEvents, teamPlayersById]);

  const homeTeamName = useMemo(
    () => teamNameById.get(subjectTeamId) ?? `Team #${subjectTeamId}`,
    [subjectTeamId, teamNameById]
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

    return assignedPlayers[modalPositionId];
  }, [assignedPlayers, modalPositionId]);

  const modalAssignedPlayer = useMemo(() => {
    if (modalPositionId == null) {
      return undefined;
    }

    return resolvedPlayers?.[modalPositionId];
  }, [resolvedPlayers, modalPositionId]);

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
      setIsFormationUpdating(true);
      handleModalClose();
      try {
        await changeFormation(nextFormation);
        resetSelection();
      } finally {
        setIsFormationUpdating(false);
      }
    },
    [changeFormation, handleModalClose, resetSelection]
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
            subjectTeamId,
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
              subjectTeamId,
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
      subjectTeamId,
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
        subjectTeamId,
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
    subjectTeamId,
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

        const sourcePlayerId = assignedPlayers[sourcePositionId];
        const targetPlayerId = assignedPlayers[positionId];

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
              subjectTeamId,
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
                subjectTeamId,
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
      subjectTeamId,
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
  };
};
