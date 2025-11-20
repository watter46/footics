'use client';

import { useState } from 'react';
import { useTeamDetail } from '../../hooks/useTeamDetail';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayerModal } from '../PlayerModal';
import type { IPlayer } from '@/lib/db';

interface TeamDetailProps {
  teamId: number;
}

export function TeamDetail({ teamId }: TeamDetailProps) {
  const { team, players, addPlayer, updatePlayer, deletePlayer } = useTeamDetail(teamId);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<IPlayer | undefined>(undefined);

  const handleAddPlayer = () => {
    setEditingPlayer(undefined);
    setIsPlayerModalOpen(true);
  };

  const handleEditPlayer = (player: IPlayer) => {
    setEditingPlayer(player);
    setIsPlayerModalOpen(true);
  };

  const handleSavePlayer = async (playerData: Omit<IPlayer, 'id' | 'teamId'>) => {
    if (editingPlayer) {
      await updatePlayer(editingPlayer.id!, playerData);
    } else {
      await addPlayer(playerData);
    }
  };

  if (!team) {
    return <div>Loading team...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{team.name}</h2>
          <p className="text-muted-foreground">Code: {team.code}</p>
        </div>
        <Button onClick={handleAddPlayer}>Add Player</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Players ({players?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {players?.map((player) => (
              <div key={player.id} className="flex items-center justify-between rounded border p-2 hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <span className="w-8 text-center font-mono font-bold">{player.number}</span>
                  <span className="font-medium">{player.name}</span>
                  <span className="text-sm text-gray-500">{player.position}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditPlayer(player)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => player.id && deletePlayer(player.id)}>Delete</Button>
                </div>
              </div>
            ))}
            {players?.length === 0 && (
              <p className="py-4 text-center text-gray-500">No players added yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {isPlayerModalOpen && (
        <PlayerModal
          open={isPlayerModalOpen}
          onOpenChange={setIsPlayerModalOpen}
          onSubmit={handleSavePlayer}
          initialData={editingPlayer}
        />
      )}
    </div>
  );
}
