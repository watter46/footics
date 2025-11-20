import { SelectableCard } from '@/components/ui/selectable-card';

type Props = {
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  subjectTeamSide: 'home' | 'away' | null;
  isDuplicateSelection: boolean;
  onSelect: (side: 'home' | 'away') => void;
};

export const TeamSelector = ({
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  subjectTeamSide,
  isDuplicateSelection,
  onSelect,
}: Props) => {
  return (
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
              onClick={() => onSelect('home')}
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
              onClick={() => onSelect('away')}
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
  );
};
