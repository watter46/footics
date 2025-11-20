'use client';

import { X, Plus } from 'lucide-react';
import { useState } from 'react';

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
import { useCreateMatch } from './hooks/useCreateMatch';

const selectStyles =
  'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50';

export const CreateMatchModal = () => {
  const [open, setOpen] = useState(false);

  const {
    teams,
    formState: {
      matchDate,
      homeTeamId,
      awayTeamId,
      subjectTeamSide,
      homeTeamName,
      awayTeamName,
      isDuplicateSelection,
      canSubmit,
    },
    setters: {
      setMatchDate,
      setHomeTeamId,
      setAwayTeamId,
      setSubjectTeamSide,
      resetForm,
    },
    handleCreateMatch,
  } = useCreateMatch(() => setOpen(false));

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> 新規作成
        </Button>
      </DialogTrigger>
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
