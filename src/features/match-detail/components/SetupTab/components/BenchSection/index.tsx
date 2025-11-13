'use client';

import { type PointerEvent } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TempPlayer } from '@/lib/db';

import { SubstituteList } from '../SubstituteList';

interface BenchSectionProps {
  recentlyDroppedPlayers: TempPlayer[];
  substitutePlayers: TempPlayer[];
  selectedBenchPlayerId: number | null;
  onSubstituteSelect: (playerId: number, isSelected: boolean) => void;
  isAssigning: boolean;
  isFormationUpdating: boolean;
}

export const BenchSection = ({
  recentlyDroppedPlayers,
  substitutePlayers,
  selectedBenchPlayerId,
  onSubstituteSelect,
  isAssigning,
  isFormationUpdating,
}: BenchSectionProps) => {
  const handleContainerPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handlePlayerSelect = (playerId: number, isSelected: boolean) => {
    onSubstituteSelect(playerId, isSelected);
  };

  const interactionDisabled = isAssigning || isFormationUpdating;

  return (
    <div className="space-y-4" onPointerDownCapture={handleContainerPointerDown}>
      {recentlyDroppedPlayers.length > 0 ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-semibold text-amber-100">
              再配置待ち
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SubstituteList
              players={recentlyDroppedPlayers}
              selectedPlayerId={selectedBenchPlayerId}
              onPlayerSelect={handlePlayerSelect}
              disabled={interactionDisabled}
              highlightVariant="reassign"
            />
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-800/70 bg-slate-900/40">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold text-slate-200">
            控え選手
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SubstituteList
            players={substitutePlayers}
            selectedPlayerId={selectedBenchPlayerId}
            onPlayerSelect={handlePlayerSelect}
            disabled={interactionDisabled}
          />
        </CardContent>
      </Card>
    </div>
  );
};
