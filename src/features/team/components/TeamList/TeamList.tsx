'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTeamList } from '../../hooks/useTeamList';
import { CreateTeamModal } from '../CreateTeamModal';

export function TeamList() {
  const { teams, deleteTeam } = useTeamList();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Teams</h2>
        <Button onClick={() => setIsCreateModalOpen(true)}>Add Team</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams?.map((team) => (
            <Card key={team.id}>
                <CardHeader>
                    <CardTitle>{team.name}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <Link href={`/teams/${team.id}`} className="text-blue-500 hover:underline">
                            Manage
                        </Link>
                        <Button variant="destructive" size="sm" onClick={() => team.id && deleteTeam(team.id)}>
                            Delete
                        </Button>
                    </div>
                </CardContent>
            </Card>
        ))}
        {teams?.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-500">
                No teams found. Create one to get started.
            </div>
        )}
      </div>

      <CreateTeamModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
