'use client';

import { CalendarDays } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HistoryTab } from '@/features/match-detail/components/HistoryTab';
import { RecordTab } from '@/features/match-detail/components/RecordTab';
import { SetupTab } from '@/features/match-detail/components/SetupTab';
import { EditEventSheet } from '@/features/match-detail/components/EditEventSheet';
import { useMatchPageState } from '@/features/match-detail/hooks/useMatchPageState';
import { useMatchTeamInfo } from '@/features/match-detail/hooks/useMatchTeamInfo';

interface MatchPageContentProps {
  matchId: number;
}

export const MatchPageContent = ({ matchId }: MatchPageContentProps) => {
  const { match, currentFormation, resolvedPlayers, isLoading, notFound } =
    useMatchPageState(matchId);

  const { teamNameById, formattedDate, isTeamsLoading } =
    useMatchTeamInfo(match);

  if (isLoading || isTeamsLoading) {
    return (
      <Card className="border-slate-800/70 bg-slate-900/40">
        <CardContent className="py-10 text-center text-sm text-slate-400">
          試合情報を読み込んでいます...
        </CardContent>
      </Card>
    );
  }

  if (notFound || !match) {
    return (
      <Card className="border-slate-800/70 bg-slate-900/40">
        <CardContent className="py-10 text-center text-sm text-slate-400">
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
      <Card className="border-slate-800/70 bg-slate-900/40">
        <CardHeader className="gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <CalendarDays className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
          <CardTitle className="grid grid-cols-[1fr_auto_1fr] items-start gap-x-7 text-2xl font-semibold text-slate-100">
            <span className="text-right text-lg font-bold">{homeTeamName}</span>
            <span className="block text-lg font-medium text-slate-500">vs</span>
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
          />
        </TabsContent>
      </Tabs>

      <EditEventSheet />
    </div>
  );
};
