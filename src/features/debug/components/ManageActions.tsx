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
  const [newActionCategory, setNewActionCategory] = useState('');

  const actions = useLiveQuery(() => db.actions_master.toArray());

  const addAction = async () => {
    if (!newActionName.trim() || !newActionCategory.trim()) return;
    try {
      await db.actions_master.add({
        name: newActionName,
        category: newActionCategory,
      });
      setNewActionName('');
      setNewActionCategory('');
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
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Action name (e.g., #DecoyRun)"
            value={newActionName}
            onChange={e => setNewActionName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAction()}
          />
          <Input
            type="text"
            placeholder="Category (e.g., 攻撃, 守備)"
            value={newActionCategory}
            onChange={e => setNewActionCategory(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAction()}
          />
          <Button type="submit" onClick={addAction} className="w-full">
            Add Action
          </Button>
        </div>
        <Separator className="my-4" />
        <h2 className="mb-2 text-lg font-semibold">Existing Actions</h2>
        <ScrollArea className="h-60 w-full rounded-md">
          <div className="p-4">
            {actions?.map(action => (
              <div
                key={action.id}
                className="mb-2 flex items-center justify-between"
              >
                <div>
                  <span className="font-medium">{action.name}</span>
                  <span className="text-muted-foreground ml-2 text-sm">
                    ({action.category})
                  </span>
                </div>
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
              <p className="text-muted-foreground text-sm">No actions found.</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
