'use client';

import { CalendarDays, ClipboardCheck, Database, Zap, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
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
import { MatchList } from '@/features/matches/components/MatchList';
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
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [matchDate, setMatchDate] = useState('');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [subjectTeamSide, setSubjectTeamSide] = useState<'home' | 'away' | null>(
    null
  );

  useEffect(() => {
    const errorMessage = searchParams.get('error');
    if (errorMessage) {
      toast.error(decodeURIComponent(errorMessage));
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  const teams = useLiveQuery(() => db.temp_teams.orderBy('name').toArray());

  const teamNameById = useMemo(() => {
    const map = new Map<number, string>();
    (teams ?? []).forEach(team => {
      if (typeof team.id === 'number') {
        map.set(team.id, team.name);
      }
    });
    return map;
  }, [teams]);

  const resolveTeamName = (value: string, fallback: string) => {
    const numericId = Number(value);
    if (!value || !Number.isFinite(numericId)) {
      return fallback;
    }
    return teamNameById.get(numericId) ?? fallback;
  };

  const homeTeamName = resolveTeamName(homeTeamId, 'ホームチーム');
  const awayTeamName = resolveTeamName(awayTeamId, 'アウェイチーム');

  const isDuplicateSelection = homeTeamId !== '' && homeTeamId === awayTeamId;
  const canSubmit = Boolean(
    matchDate &&
      homeTeamId &&
      awayTeamId &&
      subjectTeamSide &&
      !isDuplicateSelection
  );

  const resetForm = () => {
    setMatchDate('');
    setHomeTeamId('');
    setAwayTeamId('');
    setSubjectTeamSide(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleCreateMatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !subjectTeamSide) return;

    try {
      const subjectTeamId =
        subjectTeamSide === 'home' ? Number(homeTeamId) : Number(awayTeamId);
      const createdMatchId = await db.matches.add({
        date: matchDate,
        team1Id: Number(homeTeamId),
        team2Id: Number(awayTeamId),
        subjectTeamId,
      });
      setIsModalOpen(false);
      resetForm();
      if (typeof createdMatchId === 'number') {
        router.push(`/matches/${createdMatchId}`);
      }
    } catch (error) {
      console.error('Failed to create match:', error);
      toast.error('試合作成に失敗しました');
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
            Tactical Memo でリアルタイムに試合を記録し、戦術的な振り返りをシンプルに。
          </h1>
          <p className="max-w-3xl text-sm text-slate-400 sm:text-base">
            Footics は「準備 → 記録 → 振り返り」のサイクルを最短距離で回すための分析メモアプリです。フォーメーション表示、アクション記録、タイムライン編集をモバイル前提の
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
            Phase1 ではローカルに保存された最大 10 件の試合を読み込み、一覧から詳細へアクセスできます。
          </p>
        </div>
        <Separator className="bg-slate-800/70" />
        <MatchList />
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

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-200">
                    自チーム（記録対象）を選択
                  </p>
                  <span className="text-xs text-slate-500">
                    ホーム / アウェイ どちらか一方
                  </span>
                </div>

                {homeTeamId && awayTeamId ? (
                  isDuplicateSelection ? (
                    <p className="text-sm text-amber-400">
                      同じチームをホームとアウェイに設定することはできません。
                    </p>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className={`flex-1 rounded-xl border px-4 py-3 text-left text-sm transition ${
                          subjectTeamSide === 'home'
                            ? 'border-sky-500 bg-slate-900 ring-2 ring-sky-500/40'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                        }`}
                        onClick={() => setSubjectTeamSide('home')}
                      >
                        <p className="text-xs tracking-wide text-slate-500 uppercase">
                          ホーム
                        </p>
                        <p className="text-base font-semibold text-slate-100">
                          {homeTeamName}
                        </p>
                      </button>
                      <span className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
                        vs
                      </span>
                      <button
                        type="button"
                        className={`flex-1 rounded-xl border px-4 py-3 text-left text-sm transition ${
                          subjectTeamSide === 'away'
                            ? 'border-sky-500 bg-slate-900 ring-2 ring-sky-500/40'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                        }`}
                        onClick={() => setSubjectTeamSide('away')}
                      >
                        <p className="text-xs tracking-wide text-slate-500 uppercase">
                          アウェイ
                        </p>
                        <p className="text-base font-semibold text-slate-100">
                          {awayTeamName}
                        </p>
                      </button>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-slate-500">
                    先にホーム/アウェイチームを選択してください。
                  </p>
                )}
              </section>

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
