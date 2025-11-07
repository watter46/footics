'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { db, type ActionMaster, type Match, type TempPlayer } from '@/lib/db';
import { toast } from '@/features/toast/toast-store';
import { useLineupStore } from '@/features/match-detail/stores/lineup-store';
import { useTimerStore } from '@/features/timer/stores/timer-store';
import { calculateDisplayTime } from '@/lib/utils/timer';

interface RecordTabProps {
  match: Match;
  teamNameById: Map<number, string>;
}

const ACTION_CATEGORIES = [
  '攻撃',
  '守備',
  'トランジション',
  'イベント',
  'メンタル/その他',
] as const;

const usePlayers = (teamIds: readonly number[]) =>
  useLiveQuery<TempPlayer[]>(async () => {
    if (teamIds.length === 0) {
      return [];
    }
    return db.temp_players.where('teamId').anyOf(teamIds).toArray();
  }, [teamIds]) ?? [];

const useActionMasters = () =>
  useLiveQuery<ActionMaster[]>(
    async () => db.actions_master.orderBy('name').toArray(),
    []
  ) ?? [];

export const RecordTab = ({ match, teamNameById }: RecordTabProps) => {
  const matchId = match.id;
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [selectedOpponentPosition, setSelectedOpponentPosition] = useState<
    string | null
  >(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  const elapsedSeconds = useTimerStore(state => state.elapsedSeconds);
  const phase = useTimerStore(state => state.phase);
  const stoppageSeconds = useTimerStore(state => state.stoppageSeconds);

  const { main: formattedTime } = calculateDisplayTime(
    elapsedSeconds,
    phase,
    stoppageSeconds
  );

  const allStarters = useLineupStore(state => state.starters);
  const startersByMatch = useMemo(
    () => (matchId ? allStarters[matchId] ?? {} : {}),
    [matchId, allStarters]
  );

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

  const players = usePlayers(teamIds);
  const actions = useActionMasters();

  const actionsByCategory = useMemo(() => {
    const grouped = new Map<string, ActionMaster[]>();
    ACTION_CATEGORIES.forEach(cat => grouped.set(cat, []));

    actions.forEach(action => {
      const category = action.category || 'その他';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)?.push(action);
    });

    return grouped;
  }, [actions]);

  const playersById = useMemo(() => {
    const map = new Map<number, TempPlayer>();
    players.forEach(player => {
      if (player.id) {
        map.set(player.id, player);
      }
    });
    return map;
  }, [players]);

  const startersByTeam = useMemo(() => {
    const map = new Map<number, TempPlayer[]>();
    for (const teamId of teamIds) {
      const starterIds = startersByMatch[teamId] ?? [];
      const starterPlayers = starterIds
        .map(id => playersById.get(id))
        .filter((player): player is TempPlayer => Boolean(player));
      map.set(teamId, starterPlayers);
    }
    return map;
  }, [playersById, startersByMatch, teamIds]);

  const openActionModal = (playerId: number) => {
    setSelectedPlayerId(playerId);
    setSelectedOpponentPosition(null);
    setIsActionModalOpen(true);
  };

  const openOpponentActionModal = (position: string) => {
    setSelectedPlayerId(null);
    setSelectedOpponentPosition(position);
    setIsActionModalOpen(true);
  };

  const closeActionModal = () => {
    setIsActionModalOpen(false);
    setSelectedPlayerId(null);
    setSelectedOpponentPosition(null);
  };

  const handleActionSelect = async (actionId: number) => {
    if (!matchId || (!selectedPlayerId && !selectedOpponentPosition)) {
      closeActionModal();
      return;
    }

    try {
      await db.events.add({
        matchId,
        playerId: selectedPlayerId,
        opponentPosition: selectedOpponentPosition ?? undefined,
        actionId,
        matchTime: formattedTime,
      });
      toast.success('アクションを記録しました');
    } catch (error) {
      console.error('Failed to save event', error);
      toast.error('記録に失敗しました');
    } finally {
      closeActionModal();
    }
  };

  const selectedPlayer = selectedPlayerId
    ? playersById.get(selectedPlayerId)
    : null;
  const homeTeamName =
    teamNameById.get(match.team1Id) ?? `Team #${match.team1Id}`;
  const awayTeamName =
    teamNameById.get(match.team2Id) ?? `Team #${match.team2Id}`;

  const opponentPositions = ['相手GK', '相手DF', '相手MF', '相手FW'];

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
      <div className="grid gap-6 lg:grid-cols-2">
        {[match.team1Id, match.team2Id].map(teamId => {
          const teamName =
            teamId === match.team1Id ? homeTeamName : awayTeamName;
          const starters = startersByTeam.get(teamId) ?? [];

          return (
            <Card key={teamId} className="border-slate-800/70 bg-slate-900/40">
              <CardHeader>
                <CardTitle className="text-lg text-slate-100">
                  {teamName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {starters.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    スターティングメンバーが未選択です。Setupタブで設定してください。
                  </p>
                ) : (
                  <div className="space-y-3">
                    {starters.map(player => {
                      const handleRecordClick = () => {
                        if (!player.id) {
                          return;
                        }
                        openActionModal(player.id);
                      };

                      return (
                        <div
                          key={player.id}
                          className="flex items-center justify-between rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-100">
                              {player.number ? `#${player.number} ` : ''}
                              {player.name}
                            </p>
                            {player.position ? (
                              <p className="text-xs text-slate-400">
                                {player.position}
                              </p>
                            ) : null}
                          </div>
                          <Button size="sm" onClick={handleRecordClick}>
                            アクション記録
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-slate-800/70 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-lg text-slate-100">
            相手チーム（ポジション別）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {opponentPositions.map(position => (
              <Button
                key={position}
                variant="outline"
                className="h-auto py-4"
                onClick={() => openOpponentActionModal(position)}
              >
                {position}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isActionModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <Card className="w-full max-w-2xl border-slate-800/70 bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base text-slate-100">
                {selectedPlayer
                  ? `${selectedPlayer.name} のアクション`
                  : selectedOpponentPosition
                  ? `${selectedOpponentPosition} のアクション`
                  : 'アクションを選択'}
              </CardTitle>
              <Button size="icon" variant="ghost" onClick={closeActionModal}>
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <Separator className="bg-slate-800/70" />
            <CardContent className="pt-4">
              {actions.length === 0 ? (
                <p className="text-sm text-slate-400">
                  アクションマスタが登録されていません。Debugメニューで追加してください。
                </p>
              ) : (
                <Tabs defaultValue={ACTION_CATEGORIES[0]} className="w-full">
                  <TabsList className="w-full grid grid-cols-5 h-auto">
                    {ACTION_CATEGORIES.map(category => (
                      <TabsTrigger
                        key={category}
                        value={category}
                        className="text-xs sm:text-sm min-w-0 px-2"
                      >
                        {category}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {ACTION_CATEGORIES.map(category => {
                    const categoryActions =
                      actionsByCategory.get(category) ?? [];
                    return (
                      <TabsContent key={category} value={category}>
                        <ScrollArea className="max-h-[400px]">
                          <div className="grid grid-cols-2 gap-2 pr-2 sm:grid-cols-3">
                            {categoryActions.length === 0 ? (
                              <p className="col-span-full text-center text-sm text-slate-400 py-4">
                                このカテゴリにアクションがありません
                              </p>
                            ) : (
                              categoryActions.map(action => {
                                const handleSelect = () => {
                                  if (!action.id) {
                                    return;
                                  }
                                  handleActionSelect(action.id);
                                };

                                return (
                                  <Button
                                    key={action.id}
                                    variant="outline"
                                    className="h-auto py-3 text-xs"
                                    onClick={handleSelect}
                                  >
                                    {action.name}
                                  </Button>
                                );
                              })
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
};
