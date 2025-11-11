'use client';

import { CalendarDays, ClipboardCheck, Database, Zap, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { db } from '@/lib/db';
import { toast } from '@/features/toast/toast-store';

const featureCards = [
  {
    icon: Zap,
    title: 'リアルタイム記録',
    description:
      'クイックアクションとスライド評価でプレーの質を直感的にキャプチャ。',
  },
  {
    icon: Database,
    title: 'ローカル永続化',
    description:
      'Dexie.js を利用した IndexedDB 保存でオフラインでも安全にデータを保持。',
  },
  {
    icon: ClipboardCheck,
    title: 'タイムライン編集',
    description:
      '記録したアクションを後から再編集して、戦術メモを整理できます。',
  },
  {
    icon: CalendarDays,
    title: '試合管理',
    description:
      '試合作成からフォーメーション管理までを一つのワークフローで実現。',
  },
];

const HomePageContent = () => {
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [matchDate, setMatchDate] = useState('');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');

  useEffect(() => {
    const errorMessage = searchParams.get('error');
    if (errorMessage) {
      toast.error(decodeURIComponent(errorMessage));
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  const teams = useLiveQuery(() => db.temp_teams.orderBy('name').toArray());
  const matches = useLiveQuery(() =>
    db.matches.orderBy('date').reverse().toArray()
  );

  const teamNameById = useMemo(() => {
    const map = new Map<number, string>();
    (teams ?? []).forEach(team => {
      if (team.id !== undefined) {
        map.set(team.id, team.name);
      }
    });
    return map;
  }, [teams]);

  const isDuplicateSelection = homeTeamId !== '' && homeTeamId === awayTeamId;
  const canSubmit = Boolean(
    matchDate && homeTeamId && awayTeamId && !isDuplicateSelection
  );

  const resetForm = () => {
    setMatchDate('');
    setHomeTeamId('');
    setAwayTeamId('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleCreateMatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      await db.matches.add({
        date: matchDate,
        team1Id: Number(homeTeamId),
        team2Id: Number(awayTeamId),
      });
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create match:', error);
    }
  };

  const formatDate = (value: string) => {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value));
    } catch (error) {
      console.warn('Failed to format date:', error);
      return value;
    }
  };

  return (
    <main className="flex flex-col gap-16">
      <section className="space-y-10">
        <div className="flex flex-col gap-4">
          <Badge variant="info" className="w-fit">
            Phase1 MVP
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Tactical Memo
            でリアルタイムに試合を記録し、戦術的な振り返りをシンプルに。
          </h1>
          <p className="max-w-3xl text-sm text-slate-400 sm:text-base">
            Footics は「準備 → 記録 →
            振り返り」のサイクルを最短距離で回すための分析メモアプリです。フォーメーション表示、アクション記録、タイムライン編集をモバイル前提の
            UI で提供します。
          </p>
          <Button onClick={() => setIsModalOpen(true)} className="w-fit">
            新規試合を登録
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {featureCards.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="border-slate-800/70 bg-slate-900/50">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base text-slate-100">
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-slate-400">
                  {description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-100">
            あなたの試合メモ
          </h2>
          <p className="text-sm text-slate-400">
            Phase1 ではローカルに保存された最大 10
            件の試合を読み込み、一覧から詳細へアクセスできます。
          </p>
        </div>
        <Separator className="bg-slate-800/70" />
        <div className="grid gap-4">
          {(matches ?? []).length === 0 && (
            <Card className="border-dashed border-slate-800/70 bg-slate-900/40">
              <CardContent className="py-10 text-center text-sm text-slate-400">
                登録された試合がまだありません。「新規試合を登録」ボタンから試合を追加してください。
              </CardContent>
            </Card>
          )}

          {(matches ?? []).map(match => (
            <Link key={match.id} href={`/matches/${match.id ?? ''}`}>
              <Card className="border-slate-800/70 bg-slate-900/40 transition hover:border-sky-500/60 hover:bg-slate-900/60">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg text-slate-100">
                      {teamNameById.get(match.team1Id) ??
                        `Team #${match.team1Id}`}{' '}
                      vs{' '}
                      {teamNameById.get(match.team2Id) ??
                        `Team #${match.team2Id}`}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {formatDate(match.date)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                    <CalendarDays className="h-4 w-4" />
                    詳細へ
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  新規試合を登録
                </h2>
                <p className="text-sm text-slate-400">
                  ホーム・アウェイと試合日を入力してください。
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeModal}
                aria-label="モーダルを閉じる"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateMatch} className="space-y-5 px-6 py-6">
              <div className="space-y-2">
                <label
                  htmlFor="match-date"
                  className="text-sm font-medium text-slate-200"
                >
                  試合日
                </label>
                <Input
                  id="match-date"
                  type="date"
                  value={matchDate}
                  onChange={event => setMatchDate(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="home-team"
                  className="text-sm font-medium text-slate-200"
                >
                  ホームチーム
                </label>
                <select
                  id="home-team"
                  value={homeTeamId}
                  onChange={event => setHomeTeamId(event.target.value)}
                  className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                  required
                >
                  <option value="">チームを選択</option>
                  {(teams ?? []).map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="away-team"
                  className="text-sm font-medium text-slate-200"
                >
                  アウェイチーム
                </label>
                <select
                  id="away-team"
                  value={awayTeamId}
                  onChange={event => setAwayTeamId(event.target.value)}
                  className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                  required
                >
                  <option value="">チームを選択</option>
                  {(teams ?? []).map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              {isDuplicateSelection && (
                <p className="text-sm text-amber-400">
                  同じチームをホームとアウェイに設定することはできません。
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  登録する
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

const HomePage = () => (
  <Suspense fallback={null}>
    <HomePageContent />
  </Suspense>
);

export default HomePage;
