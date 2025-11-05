'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export function ManageActions() {
  const [newActionName, setNewActionName] = useState('');

  const actions = useLiveQuery(() => db.actions_master.toArray());

  const addAction = async () => {
    if (!newActionName.trim()) return;
    try {
      await db.actions_master.add({
        name: newActionName,
      });
      setNewActionName('');
    } catch (error) {
      console.error('Failed to add action:', error);
    }
  };

  const deleteAction = async (id: number) => {
    try {
      await db.actions_master.delete(id);
    } catch (error) {
      console.error('Failed to delete action:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Tactical Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            type="text"
            placeholder="e.g., #DecoyRun"
            value={newActionName}
            onChange={e => setNewActionName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAction()}
          />
          <Button type="submit" onClick={addAction}>
            Add Action
          </Button>
        </div>
        <Separator className="my-4" />
        <h2 className="text-lg font-semibold mb-2">Existing Actions</h2>
        <ScrollArea className="h-60 w-full rounded-md border">
          <div className="p-4">
            {actions?.map(action => (
              <div
                key={action.id}
                className="flex items-center justify-between mb-2"
              >
                <span>{action.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => action.id && deleteAction(action.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
            {actions?.length === 0 && (
              <p className="text-sm text-muted-foreground">No actions found.</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
