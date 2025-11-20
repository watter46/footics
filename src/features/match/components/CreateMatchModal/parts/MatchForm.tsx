import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useCreateMatch } from '../hooks/useCreateMatch';
import { TeamSelector } from './TeamSelector';

const selectStyles =
  'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50';

type Props = {
  onClose: () => void;
};

export const MatchForm = ({ onClose }: Props) => {
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
      isSubmitting,
    },
    setters: {
      setMatchDate,
      setHomeTeamId,
      setAwayTeamId,
      setSubjectTeamSide,
    },
    handleCreateMatch,
  } = useCreateMatch(onClose);

  return (
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

      <TeamSelector
        homeTeamId={homeTeamId}
        awayTeamId={awayTeamId}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        subjectTeamSide={subjectTeamSide}
        isDuplicateSelection={isDuplicateSelection}
        onSelect={setSubjectTeamSide}
      />

      <DialogFooter className="pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            キャンセル
          </Button>
        </DialogClose>
        <Button type="submit" disabled={!canSubmit}>
          {isSubmitting ? '登録中...' : '登録する'}
        </Button>
      </DialogFooter>
    </form>
  );
};
