'use client';

import { useState } from 'react';
import { CalendarDays, Pencil } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconButton } from '@/components/ui/icon-button';
import { HistoryTab } from '@/features/match-detail/components/HistoryTab';
import { RecordTab } from '@/features/match-detail/components/RecordTab';
import { SetupTab } from '@/features/match-detail/components/SetupTab';
import { EditEventSheet } from '@/features/match-detail/components/EditEventSheet';
import { EditMatchSheet } from '@/features/match-detail/components/EditMatchSheet';
import { useMatchPageState } from '@/features/match-detail/hooks/useMatchPageState';
import { useMatchTeamInfo } from '@/features/match-detail/hooks/useMatchTeamInfo';

interface MatchPageContentProps {
  matchId: number;
}

export const MatchPageContent = ({ matchId }: MatchPageContentProps) => {
  const {
    match,
    currentFormation,
    resolvedPlayers,
    resolvedSubstitutedOutPlayers,
    isLoading,
    notFound,
  } =
    useMatchPageState(matchId);

  const { teamNameById, formattedDate, isTeamsLoading } =
    useMatchTeamInfo(match);

  const [tempSlotIdMap, setTempSlotIdMap] = useState(new Map<number, string>());
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  if (isLoading || isTeamsLoading) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          試合情報を読み込んでいます...
        </CardContent>
      </Card>
    );
  }

  if (notFound || !match) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          指定された試合が見つかりませんでした。
        </CardContent>
      </Card>
    );
  }

  const homeTeamName =
    teamNameById.get(match.team1Id) ?? `Team #${match.team1Id}`;
  const awayTeamName =
    teamNameById.get(match.team2Id) ?? `Team #${match.team2Id}`;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="gap-4">
          <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs font-medium">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span>{formattedDate}</span>
            </div>
            <IconButton
              type="button"
              srLabel="試合情報を編集"
              onClick={() => setIsEditSheetOpen(true)}
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
          </div>
          <CardTitle className="text-foreground grid grid-cols-[1fr_auto_1fr] items-center gap-x-7 text-2xl font-semibold">
            <span className="text-right text-lg font-bold">{homeTeamName}</span>
            <span className="text-muted-foreground text-lg font-medium">vs</span>
            <span className="text-left text-lg font-bold">{awayTeamName}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="record" className="w-full">
        <TabsList className="mx-auto max-w-xl">
          <TabsTrigger value="record">Record</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="record">
          <RecordTab
            match={match}
            currentFormation={currentFormation}
            resolvedPlayers={resolvedPlayers}
            substitutedOutPlayers={resolvedSubstitutedOutPlayers}
            tempSlotIdMap={tempSlotIdMap}
            setTempSlotIdMap={setTempSlotIdMap}
          />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab match={match} />
        </TabsContent>

        <TabsContent value="setup">
          <SetupTab
            match={match}
            teamNameById={teamNameById}
            currentFormation={currentFormation}
            resolvedPlayers={resolvedPlayers}
            tempSlotIdMap={tempSlotIdMap}
            setTempSlotIdMap={setTempSlotIdMap}
          />
        </TabsContent>
      </Tabs>

      <EditEventSheet />
      <EditMatchSheet
        isOpen={isEditSheetOpen}
        onClose={() => setIsEditSheetOpen(false)}
        match={match}
        teamNameById={teamNameById}
      />
    </div>
  );
};
