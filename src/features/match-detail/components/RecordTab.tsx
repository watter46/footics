'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActionBottomSheet } from '@/features/match-detail/components/ActionBottomSheet';
import { db, type Match, type TempPlayer } from '@/lib/db';
import { toast } from '@/features/toast/toast-store';
import { useLineupStore } from '@/features/match-detail/stores/lineup-store';
import { useTimerStore } from '@/features/timer/stores/timer-store';
import { calculateDisplayTime } from '@/lib/utils/timer';
import { BottomSheet } from '@/components/ui/BottomSheet';

interface RecordTabProps {
  match: Match;
  teamNameById: Map<number, string>;
}

type Target =
  | { type: 'player'; id: number }
  | { type: 'opponent'; position: string };

const usePlayers = (teamIds: readonly number[]) =>
  useLiveQuery<TempPlayer[]>(async () => {
    if (teamIds.length === 0) {
      return [];
    }
    return db.temp_players.where('teamId').anyOf(teamIds).toArray();
  }, [teamIds]) ?? [];

export const RecordTab = ({ match, teamNameById }: RecordTabProps) => {
  const matchId = match.id;
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);

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

  const opponentPositions = ['相手GK', '相手DF', '相手MF', '相手FW'];

  const handleOpenForPlayer = (playerId: number) => {
    setSelectedTarget({ type: 'player', id: playerId });
    setIsSheetOpen(true);
  };

  const handleOpenForOpponent = (position: string) => {
    setSelectedTarget({ type: 'opponent', position });
    setIsSheetOpen(true);
  };

  const handleSheetChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setSelectedTarget(null);
    }
  };

  const handleActionSelect = async (actionId: number) => {
    if (!matchId || !selectedTarget) {
      handleSheetChange(false);
      return;
    }

    const payload = {
      matchId,
      actionId,
      matchTime: formattedTime,
      playerId: selectedTarget.type === 'player' ? selectedTarget.id : null,
      opponentPosition:
        selectedTarget.type === 'opponent'
          ? selectedTarget.position
          : undefined,
    } as const;

    try {
      await db.events.add(payload);
      toast.success('アクションを記録しました');
    } catch (error) {
      console.error('Failed to save event', error);
      toast.error('記録に失敗しました');
    } finally {
      handleSheetChange(false);
    }
  };

  const selectedPlayer =
    selectedTarget?.type === 'player' && selectedTarget.id
      ? playersById.get(selectedTarget.id) ?? null
      : null;

  const formatPlayerLabel = (player: TempPlayer | null) => {
    if (!player) {
      return '';
    }
    const hasNumber = typeof player.number === 'number';
    const numberPrefix = hasNumber ? `#${player.number} ` : '';
    return `${numberPrefix}${player.name}`;
  };

  const sheetTitle = selectedPlayer
    ? formatPlayerLabel(selectedPlayer)
    : selectedTarget?.type === 'opponent'
    ? `${selectedTarget.position} のアクション`
    : 'アクションを選択';

  const homeTeamName =
    teamNameById.get(match.team1Id) ?? `Team #${match.team1Id}`;
  const awayTeamName =
    teamNameById.get(match.team2Id) ?? `Team #${match.team2Id}`;

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
    <>
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {[match.team1Id, match.team2Id].map(teamId => {
            const teamName =
              teamId === match.team1Id ? homeTeamName : awayTeamName;
            const starters = startersByTeam.get(teamId) ?? [];

            return (
              <Card
                key={teamId}
                className="border-slate-800/70 bg-slate-900/40"
              >
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
                      {starters.map(player => (
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
                          <Button
                            size="sm"
                            onClick={() =>
                              player.id
                                ? handleOpenForPlayer(player.id)
                                : undefined
                            }
                          >
                            アクション記録
                          </Button>
                        </div>
                      ))}
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
                  onClick={() => handleOpenForOpponent(position)}
                >
                  {position}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <ActionBottomSheet
        isOpen={isSheetOpen}
        onOpenChange={handleSheetChange}
        onActionSelect={handleActionSelect}
        title={sheetTitle}
      />
    </>
  );
};
