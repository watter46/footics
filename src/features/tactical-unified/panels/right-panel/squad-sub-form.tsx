'use client';

import type React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
      className="p-2.5 rounded-lg bg-black/40 border border-white/[0.08] space-y-2"
    >
      <div className="grid grid-cols-3 gap-1.5">
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
          Add
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
