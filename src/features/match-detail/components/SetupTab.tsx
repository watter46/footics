'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { db, type Match, type TempPlayer } from '@/lib/db';
import { useLineupStore } from '@/features/match-detail/stores/lineup-store';

interface SetupTabProps {
  match: Match;
  teamNameById: Map<number, string>;
}

interface PlayerFormState {
  name: string;
  number: string;
  position: string;
}

const INITIAL_FORM: PlayerFormState = {
  name: '',
  number: '',
  position: '',
};

const useTeamPlayers = (teamId: number) =>
  useLiveQuery<TempPlayer[]>(
    async () => db.temp_players.where('teamId').equals(teamId).toArray(),
    [teamId]
  ) ?? [];

const TeamSetupSection = ({
  teamId,
  teamName,
  matchId,
}: {
  teamId: number;
  teamName: string;
  matchId: number;
}) => {
  const [form, setForm] = useState<PlayerFormState>(INITIAL_FORM);

  const players = useTeamPlayers(teamId);
  const toggleStarter = useLineupStore(state => state.toggleStarter);
  const allStarters = useLineupStore(state => state.starters);
  const selectedPlayerIds = useMemo(
    () => allStarters[matchId]?.[teamId] ?? [],
    [allStarters, matchId, teamId]
  );

  const handleInputChange = (field: keyof PlayerFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.number.trim()) {
      return;
    }

    try {
      await db.temp_players.add({
        teamId,
        name: form.name.trim(),
        number: Number.parseInt(form.number, 10),
        position: form.position.trim(),
      });
      setForm(INITIAL_FORM);
    } catch (error) {
      console.error('Failed to add player:', error);
    }
  };

  const handleToggleStarter = (playerId: number | undefined) => {
    if (!playerId) {
      return;
    }
    toggleStarter(matchId, teamId, playerId);
  };

  return (
    <Card className="border-slate-800/70 bg-slate-900/40">
      <CardHeader>
        <CardTitle className="text-lg text-slate-100">{teamName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-300">登録済み選手</h3>
          <Separator className="my-3 bg-slate-800/70" />
          <div className="space-y-2">
            {players.length === 0 && (
              <p className="text-sm text-slate-400">
                選手がまだ登録されていません。下のフォームから追加できます。
              </p>
            )}
            {players.map(player => {
              const isSelected = selectedPlayerIds.includes(player.id ?? -1);
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
                  <Button
                    size="sm"
                    variant={isSelected ? 'secondary' : 'outline'}
                    onClick={() => handleToggleStarter(player.id)}
                  >
                    {isSelected ? 'スタメン解除' : 'スタメンに追加'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">選手を追加</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              placeholder="選手名"
              value={form.name}
              onChange={event => handleInputChange('name', event.target.value)}
              required
            />
            <Input
              type="number"
              placeholder="背番号"
              value={form.number}
              onChange={event =>
                handleInputChange('number', event.target.value)
              }
              required
            />
            <Input
              placeholder="ポジション"
              value={form.position}
              onChange={event =>
                handleInputChange('position', event.target.value)
              }
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit">登録する</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export const SetupTab = ({ match, teamNameById }: SetupTabProps) => {
  const matchId = match.id;
  const [showOpponentSetup, setShowOpponentSetup] = useState(false);
  const homeTeamName = useMemo(
    () => teamNameById.get(match.team1Id) ?? `Team #${match.team1Id}`,
    [match.team1Id, teamNameById]
  );
  const awayTeamName = useMemo(
    () => teamNameById.get(match.team2Id) ?? `Team #${match.team2Id}`,
    [match.team2Id, teamNameById]
  );

  if (!matchId) {
    return null;
  }

  return (
    <div className="space-y-8">
      <TeamSetupSection
        teamId={match.team1Id}
        teamName={homeTeamName}
        matchId={matchId}
      />

      <div className="flex items-center justify-center">
        {showOpponentSetup ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOpponentSetup(false)}
            className="text-slate-400 hover:text-slate-300"
          >
            相手チーム設定を隠す
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOpponentSetup(true)}
            className="text-slate-400 hover:text-slate-300"
          >
            相手チームも設定する（オプション）
          </Button>
        )}
      </div>

      {showOpponentSetup && (
        <TeamSetupSection
          teamId={match.team2Id}
          teamName={awayTeamName}
          matchId={matchId}
        />
      )}
    </div>
  );
};
