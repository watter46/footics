'use client';

import { type ChangeEvent, type PointerEvent } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Pitch, defaultPitchSettings } from '@/components/pitch';
import { Formation } from '@/components/formation';
import type { Player } from '@/lib/db';
import type { FormationPlayers } from '@/types/formation';
import { FORMATION_LIST, type FormationType } from '@/lib/formation-template';

import { BenchSection } from './BenchSection';
import type { AssignModalContext, BenchItem } from '../hooks/useSetupTabState';

interface FormationSectionProps {
  homeTeamName: string;
  effectiveFormation: FormationType;
  selectedPositionId: number | null;
  isAssigning: boolean;
  isFormationUpdating: boolean;
  isSubstitutionMode: boolean;
  formationPlayers: FormationPlayers;
  benchItems: BenchItem[];
  selectedBenchPlayerId: number | null;
  onFormationChange: (event: ChangeEvent<HTMLSelectElement>) => Promise<void>;
  onPositionClick: (positionId: number, player?: Player) => Promise<void>;
  onSubstitutionModeChange: (checked: boolean) => void;
  onSubstituteSelect: (playerId: number, isSelected: boolean) => void;
  onAssignSlot: (context: AssignModalContext) => void;
}

export const FormationSection = ({
  homeTeamName,
  effectiveFormation,
  selectedPositionId,
  isAssigning,
  isFormationUpdating,
  isSubstitutionMode,
  formationPlayers,
  benchItems,
  selectedBenchPlayerId,
  onFormationChange,
  onPositionClick,
  onSubstitutionModeChange,
  onSubstituteSelect,
  onAssignSlot,
}: FormationSectionProps) => {
  const handleContainerPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    void onFormationChange(event);
  };

  const handlePositionSelect = (positionId: number, player?: Player) => {
    void onPositionClick(positionId, player);
  };

  return (
    <Card
      className="border-slate-800/70 bg-slate-900/40"
      onPointerDownCapture={handleContainerPointerDown}
    >
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg text-slate-100">{homeTeamName}</CardTitle>
        <label className="flex w-full flex-col gap-2 sm:w-52">
          <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            フォーメーション
          </span>
          <select
            className="h-10 rounded-md border border-slate-800/70 bg-slate-900/60 px-3 text-sm text-slate-100 transition focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            value={effectiveFormation}
            onChange={handleSelectChange}
            disabled={isFormationUpdating || isAssigning}
            aria-label="フォーメーションを選択"
          >
            {FORMATION_LIST.map(formation => (
              <option key={formation} value={formation}>
                {formation}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center space-x-2">
          <Switch
            id="substitution-mode"
            checked={isSubstitutionMode}
            onCheckedChange={onSubstitutionModeChange}
            disabled={isFormationUpdating || isAssigning}
          />
          <Label
            htmlFor="substitution-mode"
            className="text-xs font-semibold tracking-wide text-slate-300 uppercase"
          >
            交代モード
          </Label>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 border-t border-slate-800/60 bg-slate-900/30">
        <div className="mx-auto w-full max-w-sm">
          <Pitch className="w-full max-w-sm" settings={defaultPitchSettings}>
            <Formation
              formationName={effectiveFormation}
              players={formationPlayers}
              selectedPositionId={selectedPositionId ?? undefined}
              onPositionClick={handlePositionSelect}
            />
          </Pitch>
        </div>
        <p className="text-center text-xs text-slate-500">
          ポジションを選択してスタメンを設定してください。
        </p>
        <div className="mt-6 border-t border-slate-800/60 pt-4">
          <BenchSection
            items={benchItems}
            selectedBenchPlayerId={selectedBenchPlayerId}
            onSubstituteSelect={onSubstituteSelect}
            onAssignSlot={onAssignSlot}
          />
        </div>
      </CardContent>
    </Card>
  );
};
