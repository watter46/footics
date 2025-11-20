import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Match } from '@/lib/db';
import type { FormationPlayers } from '@/types/formation';
import type { FormationType } from '@/lib/formation-template';
import { useMatchClock } from '@/features/match/hooks/useMatchClock';
import { useFormationPlayers } from '@/features/match/hooks/useFormationPlayers';
import { useFormationSelection } from '@/features/match/hooks/useFormationSelection';
import { useEventRepository } from '@/features/match/hooks/useEventRepository';
import { useActionRepository } from '@/features/match/hooks/useActionRepository';
import { useEditEventStore } from '@/features/match/hooks/useEditEventStore';
import { toast } from '@/features/toast/toast-store';

interface UseRecordTabProps {
  match: Match;
  currentFormation?: FormationType;
  resolvedPlayers?: FormationPlayers;
  tempSlotIdMap: Map<number, string>;
  setTempSlotIdMap: Dispatch<SetStateAction<Map<number, string>>>;
}

const DEFAULT_FORMATION: FormationType = '4-2-3-1';

export const useRecordTab = ({
  match,
  currentFormation,
  resolvedPlayers,
  tempSlotIdMap,
  setTempSlotIdMap,
}: UseRecordTabProps) => {
  const matchId = match.id;
  const effectiveFormation = currentFormation ?? DEFAULT_FORMATION;

  // 1. Formation Logic
  const { formationSlots, homeFormationPlayers } = useFormationPlayers({
    match,
    formation: effectiveFormation,
    resolvedPlayers,
  });

  // 2. Selection Logic
  const {
    isSelectorOpen: isSheetOpen,
    selectedTarget,
    selectorTitle: sheetTitle,
    handlePositionClick: baseHandlePositionClick,
    handleOpenForOpponent: baseHandleOpenForOpponent,
    handleSelectorChange: baseHandleSheetChange,
  } = useFormationSelection({
    formationSlots,
    tempSlotIdMap,
    setTempSlotIdMap,
  });

  // 3. Time Management
  const { formattedTime } = useMatchClock();
  const [bufferedMatchTime, setBufferedMatchTime] = useState<string | null>(null);

  const handleSheetChange = useCallback(
    (open: boolean) => {
      baseHandleSheetChange(open);
      if (!open) {
        setBufferedMatchTime(null);
      }
    },
    [baseHandleSheetChange]
  );

  const handlePositionClick = useCallback(
    (...args: Parameters<typeof baseHandlePositionClick>) => {
      setBufferedMatchTime(formattedTime);
      baseHandlePositionClick(...args);
    },
    [baseHandlePositionClick, formattedTime]
  );

  const handleOpenForOpponent = useCallback(
    (...args: Parameters<typeof baseHandleOpenForOpponent>) => {
      setBufferedMatchTime(formattedTime);
      baseHandleOpenForOpponent(...args);
    },
    [baseHandleOpenForOpponent, formattedTime]
  );

  // 4. Action & Event Logic
  const { addEvent } = useEventRepository();
  const { getAction } = useActionRepository();
  const openEditSheet = useEditEventStore(state => state.openEditSheet);

  // Fetch actions for reference
  const actions = useLiveQuery(() => db.actions_master.toArray()) ?? [];

  const handleActionSelect = useCallback(
    async (actionId: number) => {
      if (!match || !matchId || !selectedTarget) {
        handleSheetChange(false);
        return;
      }

      const matchTime = bufferedMatchTime ?? formattedTime;
      const subjectTeamId =
        typeof match.subjectTeamId === 'number'
          ? match.subjectTeamId
          : match.team1Id;
      const opponentTeamId =
        subjectTeamId === match.team1Id ? match.team2Id : match.team1Id;
      const eventTeamId =
        selectedTarget.type === 'opponent'
          ? opponentTeamId ?? subjectTeamId
          : subjectTeamId;

      try {
        const isPlayerTarget = selectedTarget.type === 'player';
        const subjectLabel = isPlayerTarget
          ? selectedTarget.label
          : selectedTarget.position;

        let resolvedPlayerId: number | null = null;
        let resolvedTempSlotId: string | null = null;

        if (isPlayerTarget) {
          if (selectedTarget.tempSlotId) {
            resolvedTempSlotId = selectedTarget.tempSlotId;
          } else if (typeof selectedTarget.playerId === 'number') {
            resolvedPlayerId = selectedTarget.playerId;
          }
        }

        const addEventPromise = addEvent({
          matchId,
          teamId: eventTeamId,
          actionId,
          matchTime,
          playerId: isPlayerTarget ? resolvedPlayerId : null,
          tempSlotId: isPlayerTarget ? resolvedTempSlotId : null,
          positionName: isPlayerTarget ? selectedTarget.positionLabel : undefined,
          opponentPosition:
            selectedTarget.type === 'opponent'
              ? selectedTarget.position
              : undefined,
        });
        const actionPromise = getAction(actionId);

        const eventId = await addEventPromise;
        const action = await actionPromise;

        toast.success(
          {
            eventId,
            subject: subjectLabel,
            actionName: action?.name ?? 'アクション',
            time: matchTime,
          },
          undefined,
          () => {
            openEditSheet(eventId);
          }
        );
      } catch (error) {
        console.error('Failed to save event', error);
        toast.error('記録に失敗しました');
      } finally {
        setBufferedMatchTime(null);
        handleSheetChange(false);
      }
    },
    [
      bufferedMatchTime,
      formattedTime,
      match,
      matchId,
      handleSheetChange,
      openEditSheet,
      selectedTarget,
      addEvent,
      getAction,
    ]
  );

  return {
    effectiveFormation,
    homeFormationPlayers,
    isSheetOpen,
    sheetTitle,
    handleSheetChange,
    handlePositionClick,
    handleOpenForOpponent,
    handleActionSelect,
    actions,
  };
};
