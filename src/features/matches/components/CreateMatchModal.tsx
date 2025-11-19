'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconButton } from '@/components/ui/icon-button';
import { SelectableCard } from '@/components/ui/selectable-card';
import { db } from '@/lib/db';
import { toast } from '@/features/toast/toast-store';

const selectStyles =
  'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50';

type SubjectTeamSide = 'home' | 'away' | null;

export interface CreateMatchModalProps {
  trigger: ReactNode;
}

export const CreateMatchModal = ({ trigger }: CreateMatchModalProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [matchDate, setMatchDate] = useState('');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [subjectTeamSide, setSubjectTeamSide] = useState<SubjectTeamSide>(
    null
  );

  const teams = useLiveQuery(() => db.temp_teams.orderBy('name').toArray());

  const teamNameById = useMemo(() => {
    const map = new Map<number, string>();
    (teams ?? []).forEach(team => {
      if (typeof team.id === 'number') {
        map.set(team.id, team.name);
      }
    });
    return map;
  }, [teams]);

  const resolveTeamName = useCallback(
    (value: string, fallback: string) => {
      const numericId = Number(value);
      if (!value || !Number.isFinite(numericId)) {
        return fallback;
      }
      return teamNameById.get(numericId) ?? fallback;
    },
    [teamNameById]
  );

  const homeTeamName = resolveTeamName(homeTeamId, 'ホームチーム');
  const awayTeamName = resolveTeamName(awayTeamId, 'アウェイチーム');

  const isDuplicateSelection = homeTeamId !== '' && homeTeamId === awayTeamId;
  const canSubmit = Boolean(
    matchDate &&
      homeTeamId &&
      awayTeamId &&
      subjectTeamSide &&
      !isDuplicateSelection
  );

  const resetForm = () => {
    setMatchDate('');
    setHomeTeamId('');
    setAwayTeamId('');
    setSubjectTeamSide(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const handleCreateMatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !subjectTeamSide) return;

    try {
      const subjectTeamId =
        subjectTeamSide === 'home' ? Number(homeTeamId) : Number(awayTeamId);
      const createdMatchId = await db.matches.add({
        date: matchDate,
        team1Id: Number(homeTeamId),
        team2Id: Number(awayTeamId),
        subjectTeamId,
      });
      setOpen(false);
      resetForm();
      if (typeof createdMatchId === 'number') {
        router.push(`/matches/${createdMatchId}`);
      }
    } catch (error) {
      console.error('Failed to create match:', error);
      toast.error('試合作成に失敗しました');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="gap-6">
        <div className="flex items-start justify-between gap-4">
          <DialogHeader className="text-left">
            <DialogTitle>新規試合を登録</DialogTitle>
            <DialogDescription>
              ホーム・アウェイと試合日、自チームを設定してください。
            </DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <IconButton
              variant="ghost"
              srLabel="モーダルを閉じる"
              className="h-9 w-9 border-none text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </IconButton>
          </DialogClose>
        </div>

        <form onSubmit={handleCreateMatch} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="match-date">試合日</Label>
            <Input
              id="match-date"
              type="date"
              value={matchDate}
              onChange={event => setMatchDate(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="home-team">ホームチーム</Label>
            <select
              id="home-team"
              value={homeTeamId}
              onChange={event => setHomeTeamId(event.target.value)}
              className={selectStyles}
              required
            >
              <option value="">チームを選択</option>
              {(teams ?? [])
                .filter(team => typeof team.id === 'number')
                .map(team => (
                  <option key={team.id} value={String(team.id)}>
                    {team.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="away-team">アウェイチーム</Label>
            <select
              id="away-team"
              value={awayTeamId}
              onChange={event => setAwayTeamId(event.target.value)}
              className={selectStyles}
              required
            >
              <option value="">チームを選択</option>
              {(teams ?? [])
                .filter(team => typeof team.id === 'number')
                .map(team => (
                  <option key={team.id} value={String(team.id)}>
                    {team.name}
                  </option>
                ))}
            </select>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between text-sm font-medium">
              <p className="text-white">自チーム（記録対象）を選択</p>
              <span className="text-xs text-slate-400">ホーム / アウェイ どちらか一方</span>
            </div>

            {homeTeamId && awayTeamId ? (
              isDuplicateSelection ? (
                <p className="text-sm text-rose-400">
                  同じチームをホームとアウェイに設定することはできません。
                </p>
              ) : (
                <div className="flex items-center gap-3">
                  <SelectableCard
                    isSelected={subjectTeamSide === 'home'}
                    onClick={() => setSubjectTeamSide('home')}
                    className="flex-1 space-y-1 bg-white/5 text-left"
                  >
                    <p className="text-xs font-semibold tracking-[0.3em] text-slate-400 uppercase">
                      ホーム
                    </p>
                    <p className="text-base font-semibold text-white">
                      {homeTeamName}
                    </p>
                  </SelectableCard>
                  <span className="text-sm font-semibold tracking-[0.3em] text-slate-500 uppercase">
                    vs
                  </span>
                  <SelectableCard
                    isSelected={subjectTeamSide === 'away'}
                    onClick={() => setSubjectTeamSide('away')}
                    className="flex-1 space-y-1 bg-white/5 text-left"
                  >
                    <p className="text-xs font-semibold tracking-[0.3em] text-slate-400 uppercase">
                      アウェイ
                    </p>
                    <p className="text-base font-semibold text-white">
                      {awayTeamName}
                    </p>
                  </SelectableCard>
                </div>
              )
            ) : (
              <p className="text-sm text-slate-400">
                先にホーム/アウェイチームを選択してください。
              </p>
            )}
          </section>

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                キャンセル
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!canSubmit}>
              登録する
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
