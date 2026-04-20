import { MatchViewWrapper } from '@/components/features/match';

export default async function MatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  return <MatchViewWrapper matchId={matchId} />;
}
