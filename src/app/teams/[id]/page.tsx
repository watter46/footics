import { TeamDetail } from '@/features/team/components/TeamDetail';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'チーム詳細 | Footics',
  description: 'チームの詳細情報と選手一覧です。',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    return (
      <div className="container mx-auto py-8 text-center text-red-500">
        Invalid Team ID
      </div>
    );
  }

  return (
    <main className="container mx-auto py-8">
      <TeamDetail teamId={teamId} />
    </main>
  );
}
