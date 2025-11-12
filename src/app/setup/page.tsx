import { ManageActions } from '@/features/debug/components/ManageActions';
import { ManagePlayers } from '@/features/debug/components/ManagePlayers';
import { ManageTeams } from '@/features/debug/components/ManageTeams';

export default function SetupPage() {
  return (
    <div className="container mx-auto space-y-8 p-4">
      <h1 className="text-2xl font-bold">Master Data Management (Debug)</h1>
      <ManageActions />
      <ManageTeams />
      <ManagePlayers />
    </div>
  );
}
