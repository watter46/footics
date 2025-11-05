'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  db,
  type ActionMaster,
  type Event,
  type Match,
  type TempPlayer,
} from '@/lib/db';
import { toast } from '@/features/toast/toast-store';

interface HistoryTabProps {
  match: Match;
}

const useMatchEvents = (matchId?: number) =>
  useLiveQuery<Event[]>(async () => {
    if (!matchId) {
      return [];
    }
    const items = await db.events.where('matchId').equals(matchId).toArray();
    return items.sort((a, b) => {
      const timeDiff = a.matchTime.localeCompare(b.matchTime);
      if (timeDiff !== 0) {
        return timeDiff;
      }
      return (a.id ?? 0) - (b.id ?? 0);
    });
  }, [matchId]) ?? [];

const usePlayersByTeamIds = (teamIds: number[]) =>
  useLiveQuery<TempPlayer[]>(async () => {
    if (teamIds.length === 0) {
      return [];
    }
    return db.temp_players.where('teamId').anyOf(teamIds).toArray();
  }, [JSON.stringify(teamIds)]) ?? [];

const useActionMasters = () =>
  useLiveQuery<ActionMaster[]>(
    async () => db.actions_master.orderBy('name').toArray(),
    []
  ) ?? [];

export const HistoryTab = ({ match }: HistoryTabProps) => {
  const matchId = match.id;
  const events = useMatchEvents(matchId);

  const teamIds = useMemo(() => {
    const ids: number[] = [];
    if (typeof match.team1Id === 'number') {
      ids.push(match.team1Id);
    }
    if (typeof match.team2Id === 'number' && match.team2Id !== match.team1Id) {
      ids.push(match.team2Id);
    }
    return ids;
  }, [match.team1Id, match.team2Id]);

  const players = usePlayersByTeamIds(teamIds);
  const actions = useActionMasters();

  const playerNameById = useMemo(() => {
    const map = new Map<number, string>();
    players.forEach(player => {
      if (player.id) {
        const prefix = player.number ? `#${player.number} ` : '';
        map.set(player.id, `${prefix}${player.name}`);
      }
    });
    return map;
  }, [players]);

  const actionNameById = useMemo(() => {
    const map = new Map<number, string>();
    actions.forEach(action => {
      if (action.id) {
        map.set(action.id, action.name);
      }
    });
    return map;
  }, [actions]);

  const [activeEventId, setActiveEventId] = useState<number | null>(null);
  const [memoDraft, setMemoDraft] = useState('');

  const activeEvent = useMemo(() => {
    if (!activeEventId) {
      return null;
    }
    return events.find(event => event.id === activeEventId) ?? null;
  }, [activeEventId, events]);

  useEffect(() => {
    if (activeEvent) {
      setMemoDraft(activeEvent.memo ?? '');
    }
  }, [activeEvent?.id, activeEvent?.memo]);

  const closeModal = () => {
    setActiveEventId(null);
    setMemoDraft('');
  };

  const handleMemoSave = async () => {
    if (!activeEvent?.id) {
      return;
    }

    try {
      const memoValue = memoDraft.trim() === '' ? undefined : memoDraft;
      await db.events.update(activeEvent.id, { memo: memoValue });
      toast.success('メモを更新しました');
      closeModal();
    } catch (error) {
      console.error('Failed to update memo', error);
      toast.error('メモの更新に失敗しました');
    }
  };

  if (!matchId) {
    return (
      <Card className="border-slate-800/70 bg-slate-900/40">
        <CardContent className="py-10 text-center text-sm text-slate-400">
          試合情報が正しく読み込めませんでした。
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-800/70 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-lg text-slate-100">イベント履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">
              まだイベントは記録されていません。
            </p>
          ) : (
            <ScrollArea className="max-h-[480px]">
              <div className="space-y-3 pr-2">
                {events.map(event => {
                  const playerName =
                    playerNameById.get(event.playerId) ?? '選手未登録';
                  const actionName =
                    actionNameById.get(event.actionId) ?? 'アクション未登録';
                  const memo = event.memo?.trim();

                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setActiveEventId(event.id ?? null)}
                      className="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-4 py-3 text-left transition hover:border-slate-700 hover:bg-slate-900/70"
                    >
                      <div className="flex items-baseline justify-between text-sm text-slate-200">
                        <span className="font-semibold text-slate-100">
                          {event.matchTime}
                        </span>
                        <span className="text-xs uppercase tracking-wide text-slate-400">
                          {actionName}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-300">
                        {playerName}
                      </p>
                      {memo ? (
                        <p className="mt-2 truncate text-xs text-slate-400">
                          {memo}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {activeEvent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <Card className="w-full max-w-md border-slate-800/70 bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base text-slate-100">
                {activeEvent.matchTime} /{' '}
                {playerNameById.get(activeEvent.playerId) ?? '選手未登録'}
              </CardTitle>
              <Button size="icon" variant="ghost" onClick={closeModal}>
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <Separator className="bg-slate-800/70" />
            <CardContent className="space-y-4 pt-4">
              <div className="text-sm text-slate-300">
                <span className="text-slate-400">アクション: </span>
                {actionNameById.get(activeEvent.actionId) ?? 'アクション未登録'}
              </div>
              <div>
                <label
                  htmlFor="event-memo"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  メモ
                </label>
                <textarea
                  id="event-memo"
                  value={memoDraft}
                  onChange={event => setMemoDraft(event.target.value)}
                  className="min-h-[120px] w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                  placeholder="補足メモを入力"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={closeModal}>
                  キャンセル
                </Button>
                <Button onClick={handleMemoSave}>保存</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
};
