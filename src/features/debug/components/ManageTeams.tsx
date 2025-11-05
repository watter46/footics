'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export function ManageTeams() {
  const [newTeamName, setNewTeamName] = useState('');

  const teams = useLiveQuery(() => db.temp_teams.toArray());

  const addTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      await db.temp_teams.add({
        name: newTeamName,
      });
      setNewTeamName('');
    } catch (error) {
      console.error('Failed to add team:', error);
    }
  };

  const deleteTeam = async (id: number) => {
    try {
      await db.temp_teams.delete(id);
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Teams</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            type="text"
            placeholder="e.g., Team A"
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTeam()}
          />
          <Button type="submit" onClick={addTeam}>
            Add Team
          </Button>
        </div>
        <Separator className="my-4" />
        <h2 className="text-lg font-semibold mb-2">Existing Teams</h2>
        <ScrollArea className="h-60 w-full rounded-md border">
          <div className="p-4">
            {teams?.map(team => (
              <div
                key={team.id}
                className="flex items-center justify-between mb-2"
              >
                <span>{team.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => team.id && deleteTeam(team.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
            {teams?.length === 0 && (
              <p className="text-sm text-muted-foreground">No teams found.</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
