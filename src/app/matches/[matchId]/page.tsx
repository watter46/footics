import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Timer } from '@/features/timer/components/Timer';

import { MatchPageContent } from '@/features/match-detail/components/MatchPageContent';

interface MatchDetailPageProps {
  params: Promise<{ matchId: string }>;
}

export default async function MatchDetailPage({
  params,
}: MatchDetailPageProps) {
  const { matchId: matchIdParam } = await params;
  const parsedMatchId = Number.parseInt(matchIdParam, 10);

  if (Number.isNaN(parsedMatchId) || !Number.isFinite(parsedMatchId)) {
    const errorMessage = encodeURIComponent(
      '試合IDが正しくありません。URLをご確認ください。'
    );
    redirect(`/?error=${errorMessage}`);
  }

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
      </div>

      <MatchPageContent matchId={parsedMatchId} />
    </main>
  );
}
