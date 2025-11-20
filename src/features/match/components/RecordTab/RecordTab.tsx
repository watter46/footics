'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Pitch, defaultPitchSettings } from '@/components/pitch';
import { Formation } from '@/components/formation';
import { ActionBottomSheet } from '@/features/match/components/ActionBottomSheet';
import type { Match, Player } from '@/lib/db';
import type { FormationPlayers } from '@/types/formation';
import type { FormationType } from '@/lib/formation-template';
import { useRecordTab } from './hooks/useRecordTab';
import { OpponentPositions } from './parts/OpponentPositions';
import { SubstitutedPlayers } from './parts/SubstitutedPlayers';

interface RecordTabProps {
  match: Match;
  currentFormation?: FormationType;
  resolvedPlayers?: FormationPlayers;
  substitutedOutPlayers: Player[];
  tempSlotIdMap: Map<number, string>;
  setTempSlotIdMap: Dispatch<SetStateAction<Map<number, string>>>;
}

export const RecordTab = ({
  match,
  currentFormation,
  resolvedPlayers,
  substitutedOutPlayers,
  tempSlotIdMap,
  setTempSlotIdMap,
}: RecordTabProps) => {
  const {
    effectiveFormation,
    homeFormationPlayers,
    isSheetOpen,
    sheetTitle,
    handleSheetChange,
    handlePositionClick,
    handleOpenForOpponent,
    handleActionSelect,
  } = useRecordTab({
    match,
    currentFormation,
    resolvedPlayers,
    tempSlotIdMap,
    setTempSlotIdMap,
  });

  if (!match.id) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          試合情報が正しく読み込めませんでした。
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <div className="mx-auto w-full max-w-sm">
              <Pitch
                className="w-full max-w-sm"
                settings={defaultPitchSettings}
              >
                <Formation
                  formationName={effectiveFormation}
                  players={homeFormationPlayers}
                  onPositionClick={handlePositionClick}
                />
              </Pitch>
            </div>
          </CardContent>
        </Card>

        <OpponentPositions onPositionClick={handleOpenForOpponent} />

        <SubstitutedPlayers players={substitutedOutPlayers} />
      </div>

      <ActionBottomSheet
        isOpen={isSheetOpen}
        onOpenChange={handleSheetChange}
        onActionSelect={(actionId: number, _actionName: string) =>
          handleActionSelect(actionId)
        }
        title={sheetTitle}
      />
    </>
  );
};
