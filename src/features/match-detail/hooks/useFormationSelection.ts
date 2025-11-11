import { useCallback, useMemo, useState } from 'react';
import type { Player } from '@/lib/db';
import type { FormationPosition } from '@/lib/formation-template';

export type FormationSelectionTarget =
  | {
      type: 'player';
      playerId: number | null;
      positionId: number;
      positionLabel: string;
      label: string;
    }
  | { type: 'opponent'; position: string };

interface UseFormationSelectionParams {
  formationSlots: FormationPosition[];
}

interface UseFormationSelectionResult {
  isSelectorOpen: boolean;
  selectedTarget: FormationSelectionTarget | null;
  selectorTitle: string;
  handlePositionClick: (positionId: number, player?: Player) => void;
  handleOpenForOpponent: (position: string) => void;
  handleSelectorChange: (open: boolean) => void;
}

const buildPlayerLabel = (
  positionLabel: string,
  player?: Player | null
): { label: string; playerId: number | null } => {
  if (!player || typeof player.id !== 'number') {
    return {
      label: positionLabel,
      playerId: null,
    };
  }

  const hasNumber = Number.isFinite(player.number);
  const numberFragment = hasNumber ? ` #${player.number}` : '';
  const nameFragment = player.name ? ` ${player.name}` : '';

  return {
    label: `${positionLabel}${numberFragment}${nameFragment}`.trim(),
    playerId: player.id,
  };
};

export const useFormationSelection = ({
  formationSlots,
}: UseFormationSelectionParams): UseFormationSelectionResult => {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] =
    useState<FormationSelectionTarget | null>(null);

  const findSlot = useCallback(
    (positionId: number) =>
      formationSlots.find(slot => slot.id === positionId) ?? null,
    [formationSlots]
  );

  const handlePositionClick = useCallback(
    (positionId: number, player?: Player) => {
      const slot = findSlot(positionId);
      const positionLabel = slot?.position ?? 'フィールド';
      const { label, playerId } = buildPlayerLabel(positionLabel, player);

      setSelectedTarget({
        type: 'player',
        playerId,
        positionId,
        positionLabel,
        label,
      });
      setIsSelectorOpen(true);
    },
    [findSlot]
  );

  const handleOpenForOpponent = useCallback((position: string) => {
    setSelectedTarget({ type: 'opponent', position });
    setIsSelectorOpen(true);
  }, []);

  const handleSelectorChange = useCallback((open: boolean) => {
    setIsSelectorOpen(open);
    if (!open) {
      setSelectedTarget(null);
    }
  }, []);

  const selectorTitle = useMemo(() => {
    if (!selectedTarget) {
      return 'アクションを選択';
    }

    if (selectedTarget.type === 'opponent') {
      return `${selectedTarget.position} のアクション`;
    }

    return selectedTarget.label;
  }, [selectedTarget]);

  return {
    isSelectorOpen,
    selectedTarget,
    selectorTitle,
    handlePositionClick,
    handleOpenForOpponent,
    handleSelectorChange,
  };
};
