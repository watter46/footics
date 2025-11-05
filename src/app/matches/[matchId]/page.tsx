'use client';

import Link from 'next/link';
import { use, useMemo } from 'react';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db, type Match, type TempTeam } from '@/lib/db';
import { HistoryTab } from '@/features/match-detail/components/HistoryTab';
import { RecordTab } from '@/features/match-detail/components/RecordTab';
import { SetupTab } from '@/features/match-detail/components/SetupTab';
import { Timer } from '@/features/timer/components/Timer';

interface MatchDetailPageProps {
  params: Promise<{ matchId: string }>;
}

const MatchDetailPage = ({ params }: MatchDetailPageProps) => {
  const { matchId: matchIdParam } = use(params);
  const parsedMatchId = Number.parseInt(matchIdParam, 10);
  const matchId = Number.isNaN(parsedMatchId) ? null : parsedMatchId;

  const matchResult = useLiveQuery<{ match: Match | null }>(async () => {
    if (matchId === null) {
      return { match: null };
    }
    const record = await db.matches.get(matchId);
    return { match: record ?? null };
  }, [matchId]);

  const match = matchResult?.match ?? null;

  const teamIds = useMemo(() => {
    if (!match) {
      return [] as number[];
    }
    const ids = [match.team1Id, match.team2Id];
    return Array.from(new Set(ids.filter(teamId => Number.isFinite(teamId))));
  }, [match?.team1Id, match?.team2Id]);

  const teams =
    useLiveQuery<TempTeam[]>(async () => {
      if (teamIds.length === 0) {
        return [];
      }
      return db.temp_teams.where('id').anyOf(teamIds).toArray();
    }, [JSON.stringify(teamIds)]) ?? [];

  const teamNameById = useMemo(() => {
    const map = new Map<number, string>();
    teams.forEach(team => {
      if (team.id !== undefined) {
        map.set(team.id, team.name);
      }
    });
    return map;
  }, [teams]);

  const formattedDate = useMemo(() => {
    if (!match?.date) {
      return '';
    }
    try {
      return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(match.date));
    } catch (error) {
      console.warn('Failed to format match date', error);
      return match.date;
    }
  }, [match?.date]);

  const isLoading = matchResult === undefined;
  const isInvalidId = matchId === null;
  const notFound = !isLoading && !isInvalidId && !match;

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
        <Card className="border-slate-800/70 bg-slate-900/40">
          <CardContent className="py-10 text-center text-sm text-slate-400">
            試合情報を読み込んでいます...
          </CardContent>
        </Card>
      </main>
    );
  }

  if (isInvalidId || notFound) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          試合一覧に戻る
        </Link>
        <Card className="border-slate-800/70 bg-slate-900/40">
          <CardContent className="py-10 text-center text-sm text-slate-400">
            指定された試合が見つかりませんでした。
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!match) {
    return null;
  }

  const homeTeamName =
    teamNameById.get(match.team1Id) ?? `Team #${match.team1Id}`;
  const awayTeamName =
    teamNameById.get(match.team2Id) ?? `Team #${match.team2Id}`;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10">
      <Timer />

      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          試合一覧に戻る
        </Link>
        {formattedDate ? (
          <div className="inline-flex items-center gap-2 text-sm text-slate-400">
            <CalendarDays className="h-4 w-4" />
            {formattedDate}
          </div>
        ) : null}
      </div>

      <Card className="border-slate-800/70 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-slate-100">
            {homeTeamName} <span className="text-slate-500">vs</span>{' '}
            {awayTeamName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">
            下のタブから「記録」「履歴」「セットアップ」を切り替えて操作できます。
          </p>
        </CardContent>
      </Card>

      <Separator className="bg-slate-800/70" />

      <Tabs defaultValue="record" className="w-full">
        <TabsList>
          <TabsTrigger value="record">Record</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="record">
          <RecordTab match={match} teamNameById={teamNameById} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab match={match} />
        </TabsContent>

        <TabsContent value="setup">
          <SetupTab match={match} teamNameById={teamNameById} />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default MatchDetailPage;
