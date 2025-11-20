import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Timer } from '@/features/timer/components/Timer';

import { MatchDetail } from '@/features/match/components/MatchDetail';

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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pt-10 pb-16 sm:px-6 lg:px-10">
      <Timer />

      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition"
        >
          <ArrowLeft className="h-4 w-4" />
          試合一覧に戻る
        </Link>
      </div>

      <MatchDetail matchId={parsedMatchId} />
    </main>
  );
}
