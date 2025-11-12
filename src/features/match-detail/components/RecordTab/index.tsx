'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pitch, defaultPitchSettings } from '@/components/pitch';
import { Formation } from '@/components/formation';
import { ActionBottomSheet } from '@/features/match-detail/components/ActionBottomSheet';
import type { Match } from '@/lib/db';
import type { FormationPlayers } from '@/lib/types';
import type { FormationType } from '@/lib/formation-template';
import { useMatchClock } from '@/features/match-detail/hooks/useMatchClock';
import { useFormationPlayers } from '@/features/match-detail/hooks/useFormationPlayers';
import { useFormationSelection } from '@/features/match-detail/hooks/useFormationSelection';
import { useMatchEventRecorder } from '@/features/match-detail/hooks/useMatchEventRecorder';

interface RecordTabProps {
  match: Match;
  currentFormation?: FormationType;
  resolvedPlayers?: FormationPlayers;
}

const DEFAULT_FORMATION: FormationType = '4-2-3-1';
export const RecordTab = ({
  match,
  currentFormation,
  resolvedPlayers,
}: RecordTabProps) => {
  const matchId = match.id;
  const effectiveFormation = currentFormation ?? DEFAULT_FORMATION;
  const { formationSlots, homeFormationPlayers } = useFormationPlayers({
    match,
    formation: effectiveFormation,
    resolvedPlayers,
  });
  const [bufferedMatchTime, setBufferedMatchTime] = useState<string | null>(null);
  const {
    isSelectorOpen: isSheetOpen,
    selectedTarget,
    selectorTitle: sheetTitle,
    handlePositionClick: baseHandlePositionClick,
    handleOpenForOpponent: baseHandleOpenForOpponent,
    handleSelectorChange: baseHandleSheetChange,
  } = useFormationSelection({ formationSlots });
  const { formattedTime } = useMatchClock();
  const handleSheetChange = useCallback(
    (open: boolean) => {
      baseHandleSheetChange(open);
      if (!open) {
        setBufferedMatchTime(null);
      }
    },
    [baseHandleSheetChange]
  );
  const { handleActionSelect } = useMatchEventRecorder({
    matchId,
    selectedTarget,
    bufferedMatchTime,
    fallbackTime: formattedTime,
    onClose: () => handleSheetChange(false),
    onAfterRecord: () => setBufferedMatchTime(null),
  });

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

  const opponentPositions = ['相手GK', '相手DF', '相手MF', '相手FW'];

  if (!matchId) {
    return (
      <Card className="border-slate-800/70 bg-slate-900/40">
        <CardContent className="py-10 text-center text-sm text-slate-400">
          試合情報が正しく読み込めませんでした。
        </CardContent>
      </Card>
    );
  }
  return (
    <>
      <div className="space-y-6">
        <Card className="border-slate-800/70 bg-slate-900/40">
          <CardContent className="space-y-4 border-t border-slate-800/60 bg-slate-900/30">
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

        <Card className="border-slate-800/70 bg-slate-900/40">
          <CardHeader>
            <CardTitle className="text-lg text-slate-100">
              相手チーム（ポジション別）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {opponentPositions.map(position => (
                <Button
                  key={position}
                  variant="outline"
                  className="h-auto py-4"
                  onClick={() => handleOpenForOpponent(position)}
                >
                  {position}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <ActionBottomSheet
        isOpen={isSheetOpen}
        onOpenChange={handleSheetChange}
        onActionSelect={handleActionSelect}
        title={sheetTitle}
      />
    </>
  );
};
