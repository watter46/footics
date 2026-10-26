'use client';

import type React from 'react';

export interface SquadSubFormProps {
  newSubNo: string;
  setNewSubNo: (val: string) => void;
  newSubPos: string;
  setNewSubPos: (val: string) => void;
  newSubName: string;
  setNewSubName: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function SquadSubForm({
  newSubNo,
  setNewSubNo,
  newSubPos,
  setNewSubPos,
  newSubName,
  setNewSubName,
  onSubmit,
}: SquadSubFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="p-2.5 rounded-lg bg-black/40 border border-white/10 space-y-2"
    >
      <div className="grid grid-cols-3 gap-1.5">
        <input
          type="text"
          placeholder="No."
          value={newSubNo}
          onChange={(e) => setNewSubNo(e.target.value)}
          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
        />
        <input
          type="text"
          placeholder="Pos"
          value={newSubPos}
          onChange={(e) => setNewSubPos(e.target.value)}
          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
        />
        <button
          type="submit"
          className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer shadow-sm transition-colors"
        >
          Add
        </button>
      </div>
      <input
        type="text"
        placeholder="Player Name"
        value={newSubName}
        onChange={(e) => setNewSubName(e.target.value)}
        className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
      />
    </form>
  );
}
