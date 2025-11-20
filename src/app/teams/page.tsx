import { TeamList } from '@/features/team/components/TeamList';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'チーム一覧 | Footics',
  description: '登録されているチームの一覧です。',
};

export default function TeamsPage() {
  return (
    <main className="container mx-auto py-8">
      <TeamList />
    </main>
  );
}
