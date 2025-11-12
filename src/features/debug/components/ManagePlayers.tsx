'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export function ManagePlayers() {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerPosition, setPlayerPosition] = useState('');

  const teams = useLiveQuery(() => db.temp_teams.toArray(), []);

  const players = useLiveQuery(() => {
    if (selectedTeamId === null) return [];
    return db.temp_players.where('teamId').equals(selectedTeamId).toArray();
  }, [selectedTeamId]);

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
      setPlayerName('');
      setPlayerNumber('');
      setPlayerPosition('');
    } catch (error) {
      console.error('Failed to add player:', error);
      alert('Failed to add player. Check console for details.');
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
    <Card>
      <CardHeader>
        <CardTitle>Manage Players</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <label
            htmlFor="team-select-players"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Select a Team
          </label>
          <select
            id="team-select-players"
            value={selectedTeamId ?? ''}
            onChange={e => setSelectedTeamId(Number(e.target.value) || null)}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 pr-10 pl-3 text-base focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
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

        {selectedTeamId !== null && (
          <div className="mb-4">
            <h3 className="text-md mb-2 font-semibold">Add New Player</h3>
            <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-4">
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
                placeholder="Position"
                value={playerPosition}
                onChange={e => setPlayerPosition(e.target.value)}
              />
              <Button onClick={handleAddPlayer}>Add Player</Button>
            </div>
          </div>
        )}

        <Separator className="my-4" />

        <div>
          <h3 className="text-md mb-2 font-semibold">Player List</h3>
          <ScrollArea className="h-60 w-full rounded-md border">
            <div className="p-4">
              {players && players.length > 0 ? (
                players.map(player => (
                  <div
                    key={player.id}
                    className="mb-2 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold">{player.number}</span> -{' '}
                      {player.name} ({player.position})
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => player.id && handleDeletePlayer(player.id)}
                    >
                      Delete
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  {selectedTeamId
                    ? 'No players found.'
                    : 'Select a team to see players.'}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
