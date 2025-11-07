'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function ManageTempPlayers() {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerPosition, setPlayerPosition] = useState('');

  // 1. Get all teams for the dropdown
  const teams = useLiveQuery(() => db.temp_teams.toArray(), []);

  // 3. Get players for the selected team
  const players = useLiveQuery(
    () => {
      if (selectedTeamId === null) return [];
      return db.temp_players.where('teamId').equals(selectedTeamId).toArray();
    },
    [selectedTeamId] // Re-run query when selectedTeamId changes
  );

  const handleAddPlayer = async () => {
    if (!selectedTeamId || !playerName.trim() || !playerNumber.trim()) {
      alert('Please select a team, and enter a player name and number.');
      return;
    }
    try {
      await db.temp_players.add({
        teamId: selectedTeamId,
        name: playerName,
        number: parseInt(playerNumber, 10),
        position: playerPosition,
      });
      // Clear form
      setPlayerName('');
      setPlayerNumber('');
      setPlayerPosition('');
    } catch (error) {
      console.error('Failed to add player:', error);
      alert(
        'Failed to add player. Check console for details (e.g., duplicate number).'
      );
    }
  };

  const handleDeletePlayer = async (id: number) => {
    try {
      await db.temp_players.delete(id);
    } catch (error) {
      console.error('Failed to delete player:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Manage Temporary Players (temp_players)</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Team Selector */}
          <div className="mb-4">
            <label
              htmlFor="team-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              1. Select a Team
            </label>
            <select
              id="team-select"
              value={selectedTeamId ?? ''}
              onChange={e => setSelectedTeamId(Number(e.target.value) || null)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
            >
              <option value="">-- Please select a team --</option>
              {teams?.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <Separator className="my-4" />

          {/* Add Player Form */}
          {selectedTeamId !== null && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">2. Add New Player</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                <Input
                  placeholder="Player Name"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Number"
                  value={playerNumber}
                  onChange={e => setPlayerNumber(e.target.value)}
                />
                <Input
                  placeholder="Position (e.g., CMF)"
                  value={playerPosition}
                  onChange={e => setPlayerPosition(e.target.value)}
                />
                <Button onClick={handleAddPlayer}>Add Player</Button>
              </div>
            </div>
          )}

          <Separator className="my-4" />

          {/* Player List */}
          <div>
            <h2 className="text-lg font-semibold mb-2">3. Player List</h2>
            <ScrollArea className="h-72 w-full rounded-md border">
              <div className="p-4">
                {players && players.length > 0 ? (
                  players.map(player => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between mb-2"
                    >
                      <div>
                        <span className="font-bold">{player.number}</span> -{' '}
                        {player.name} ({player.position})
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          player.id && handleDeletePlayer(player.id)
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {selectedTeamId
                      ? 'No players found for this team.'
                      : 'Please select a team to see its players.'}
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
