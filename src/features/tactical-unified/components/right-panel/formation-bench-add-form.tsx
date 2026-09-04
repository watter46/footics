'use client';

import type React from 'react';
import { useState } from 'react';

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
      className="p-2 rounded bg-black/40 border border-white/10 space-y-1.5"
    >
      <div className="grid grid-cols-3 gap-1">
        <input
          type="text"
          placeholder="No."
          value={newSubNo}
          onChange={(e) => setNewSubNo(e.target.value)}
          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs"
        />
        <input
          type="text"
          placeholder="Pos"
          value={newSubPos}
          onChange={(e) => setNewSubPos(e.target.value)}
          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs"
        />
        <button
          type="submit"
          className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
        >
          Add Player
        </button>
      </div>
      <input
        type="text"
        placeholder="Player Name"
        value={newSubName}
        onChange={(e) => setNewSubName(e.target.value)}
        className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs"
      />
    </form>
  );
}
