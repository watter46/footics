'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedInitialData } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function ManageTempTeams() {
  const [newTeamName, setNewTeamName] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  // Get all teams from the temp_teams table
  const teams = useLiveQuery(() => db.temp_teams.toArray());

  const handleSeedTeams = async () => {
    try {
      setIsSeeding(true);
      await seedInitialData({ reset: true });
    } catch (error) {
      console.error('Failed to seed teams:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  // Add a new team
  const addTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      await db.temp_teams.add({
        name: newTeamName,
      });
      setNewTeamName(''); // Clear input field
    } catch (error) {
      console.error('Failed to add team:', error);
      // Here you could add a user-facing error message
    }
  };

  // Delete a team
  const deleteTeam = async (id: number) => {
    try {
      await db.temp_teams.delete(id);
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Manage Temporary Teams (temp_teams)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSeedTeams}
              disabled={isSeeding}
            >
              {isSeeding ? 'Seeding...' : 'Seed Default Data'}
            </Button>
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

          <h2 className="mb-2 text-lg font-semibold">Existing Teams</h2>
          <ScrollArea className="h-72 w-full rounded-md">
            <div className="p-4">
              {teams?.map(team => (
                <div
                  key={team.id}
                  className="mb-2 flex items-center justify-between"
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
                <p className="text-muted-foreground text-sm">
                  No teams found. Add one above.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
