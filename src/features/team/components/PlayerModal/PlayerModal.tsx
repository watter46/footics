'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { IPlayer } from '@/lib/db';

interface PlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (player: Omit<IPlayer, 'id' | 'teamId'>) => Promise<void>;
  initialData?: IPlayer;
}

export function PlayerModal({ open, onOpenChange, onSubmit, initialData }: PlayerModalProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [number, setNumber] = useState(initialData?.number?.toString() ?? '');
  const [position, setPosition] = useState(initialData?.position ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      number: parseInt(number, 10),
      position,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Player' : 'Add Player'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="number">Number</Label>
            <Input id="number" type="number" value={number} onChange={(e) => setNumber(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
