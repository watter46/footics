'use client';

import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FormationBenchAddFormProps {
  activeSlideId: string;
  activeTeam: 'home' | 'away';
  onAddPlayer: (
    slideId: string,
    team: 'home' | 'away',
    name?: string,
    shirtNo?: string,
    pos?: string,
    area?: 'pitch' | 'bench',
  ) => void;
  onClose: () => void;
}

export function FormationBenchAddForm({
  activeSlideId,
  activeTeam,
  onAddPlayer,
  onClose,
}: FormationBenchAddFormProps) {
  const [newSubName, setNewSubName] = useState('');
  const [newSubNo, setNewSubNo] = useState('');
  const [newSubPos, setNewSubPos] = useState('SUB');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() && !newSubNo.trim()) return;
    onAddPlayer(
      activeSlideId,
      activeTeam,
      newSubName.trim() || undefined,
      newSubNo.trim() || undefined,
      newSubPos.trim() || undefined,
      'bench',
    );
    setNewSubName('');
    setNewSubNo('');
    onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-2 rounded bg-black/40 border border-white/[0.08] space-y-1.5"
    >
      <div className="grid grid-cols-3 gap-1">
        <Input
          type="text"
          placeholder="No."
          value={newSubNo}
          onChange={(e) => setNewSubNo(e.target.value)}
          className="h-7 text-xs px-2 py-1"
        />
        <Input
          type="text"
          placeholder="Pos"
          value={newSubPos}
          onChange={(e) => setNewSubPos(e.target.value)}
          className="h-7 text-xs px-2 py-1"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="h-7 text-xs font-semibold"
        >
          Add Player
        </Button>
      </div>
      <Input
        type="text"
        placeholder="Player Name"
        value={newSubName}
        onChange={(e) => setNewSubName(e.target.value)}
        className="h-7 text-xs px-2 py-1"
      />
    </form>
  );
}
