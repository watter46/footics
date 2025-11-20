'use client';

import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type Match } from '@/lib/db';
import {
  useMatchUpdate,
  type MatchUpdatePayload,
} from '../../hooks/useMatchUpdate';

interface EditMatchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  teamNameById: Map<number, string>;
}

interface FormState {
  date: string;
  team1Id: string;
  team2Id: string;
}

type SubjectTeamSide = 'home' | 'away' | null;

const formatDateForInput = (value: string | undefined): string => {
  if (!value) {
    return '';
  }

  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnlyPattern.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const EditMatchSheet = ({
  isOpen,
  onClose,
  match,
  teamNameById,
}: EditMatchSheetProps) => {
  const resolvedMatchId =
    typeof match.id === 'number' ? match.id : Number.NaN;
  const { updateMatchInfo, isUpdating } = useMatchUpdate(resolvedMatchId);

  const handleSheetClose = () => {
    if (isUpdating) {
      return;
    }
    onClose();
  };

  const contentKey = `${match.id ?? 'match'}-${match.date ?? 'no-date'}-${match.team1Id}-${match.team2Id}-${match.subjectTeamId ?? 'subject'}`;

  return (
    <BottomSheet isOpen={isOpen} onClose={handleSheetClose} className="gap-6">
      {isOpen ? (
        <EditMatchSheetForm
          key={contentKey}
          match={match}
          teamNameById={teamNameById}
          isUpdating={isUpdating}
          onClose={handleSheetClose}
          onSubmit={updateMatchInfo}
        />
      ) : null}
    </BottomSheet>
  );
};

interface EditMatchSheetFormProps {
  match: Match;
  teamNameById: Map<number, string>;
  isUpdating: boolean;
  onClose: () => void;
  onSubmit: (payload: MatchUpdatePayload) => Promise<void>;
}

const EditMatchSheetForm = ({
  match,
  teamNameById,
  isUpdating,
  onClose,
  onSubmit,
}: EditMatchSheetFormProps) => {
  const initialSubjectTeamId = match.subjectTeamId ?? match.team1Id;
  const initialSubjectTeamSide: SubjectTeamSide =
    initialSubjectTeamId === match.team2Id ? 'away' : 'home';
  const [formState, setFormState] = useState<FormState>(() => ({
    date: formatDateForInput(match.date),
    team1Id: String(match.team1Id ?? ''),
    team2Id: String(match.team2Id ?? ''),
  }));
  const [formError, setFormError] = useState<string | null>(null);
  const [subjectTeamSide, setSubjectTeamSide] = useState<SubjectTeamSide>(
    initialSubjectTeamSide
  );

  const teamOptions = useMemo(() => {
    return Array.from(teamNameById.entries()).sort(([, nameA], [, nameB]) =>
      nameA.localeCompare(nameB, 'ja')
    );
  }, [teamNameById]);

  const resolvedHomeTeamId = Number(formState.team1Id);
  const resolvedAwayTeamId = Number(formState.team2Id);
  const homeTeamName =
    formState.team1Id && Number.isFinite(resolvedHomeTeamId)
      ? teamNameById.get(resolvedHomeTeamId) ?? 'ホームチーム'
      : 'ホームチーム';
  const awayTeamName =
    formState.team2Id && Number.isFinite(resolvedAwayTeamId)
      ? teamNameById.get(resolvedAwayTeamId) ?? 'アウェイチーム'
      : 'アウェイチーム';

  const sameTeamSelected =
    formState.team1Id !== '' && formState.team1Id === formState.team2Id;
  const resolvedSubjectTeamId =
    subjectTeamSide === 'home'
      ? Number(formState.team1Id)
      : subjectTeamSide === 'away'
        ? Number(formState.team2Id)
        : null;
  const hasValidSubjectTeamId =
    resolvedSubjectTeamId != null && Number.isFinite(resolvedSubjectTeamId);
  const isFormIncomplete =
    !formState.date || !formState.team1Id || !formState.team2Id || !hasValidSubjectTeamId;
  const isSaveDisabled = isFormIncomplete || sameTeamSelected || isUpdating;
  const hasSubjectChanged =
    hasValidSubjectTeamId && resolvedSubjectTeamId !== initialSubjectTeamId;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (isFormIncomplete) {
      setFormError('日付とチームをすべて選択してください');
      return;
    }

    if (sameTeamSelected) {
      setFormError('ホームとアウェイに同じチームは選べません');
      return;
    }

    const nextTeam1Id = Number(formState.team1Id);
    const nextTeam2Id = Number(formState.team2Id);

    if (!Number.isFinite(nextTeam1Id) || !Number.isFinite(nextTeam2Id)) {
      setFormError('チーム選択に問題があります');
      return;
    }

    if (!hasValidSubjectTeamId || resolvedSubjectTeamId == null) {
      setFormError('自チーム（記録対象）を選択してください');
      return;
    }

    try {
      await onSubmit({
        date: formState.date,
        team1Id: nextTeam1Id,
        team2Id: nextTeam2Id,
        subjectTeamId: resolvedSubjectTeamId,
      });
      onClose();
    } catch {
      // すでにトースト表示済み。必要に応じてフォーム内にエラーを残す。
      setFormError('試合情報の更新に失敗しました');
    }
  };

  const handleFieldChange = (field: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { value } = event.target;
      setFormState(prev => ({ ...prev, [field]: value }));

      if (field === 'team1Id' && value === '' && subjectTeamSide === 'home') {
        setSubjectTeamSide(null);
      }

      if (field === 'team2Id' && value === '' && subjectTeamSide === 'away') {
        setSubjectTeamSide(null);
      }
    };

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-100">試合情報の編集</h2>
        <p className="text-sm text-slate-400">日付と対戦チームを更新できます。</p>
      </header>

      <section className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="match-date">日付</Label>
          <Input
            id="match-date"
            type="date"
            required
            value={formState.date}
            onChange={handleFieldChange('date')}
            disabled={isUpdating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="home-team">ホームチーム</Label>
          <select
            id="home-team"
            className="h-10 w-full rounded-md border border-slate-800/70 bg-slate-900/60 px-3 text-sm text-slate-100 transition focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            value={formState.team1Id}
            onChange={handleFieldChange('team1Id')}
            disabled={isUpdating || teamOptions.length === 0}
            required
          >
            <option value="" disabled>
              チームを選択
            </option>
            {teamOptions.map(([teamId, teamName]) => (
              <option key={teamId} value={teamId}>
                {teamName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="away-team">アウェイチーム</Label>
          <select
            id="away-team"
            className="h-10 w-full rounded-md border border-slate-800/70 bg-slate-900/60 px-3 text-sm text-slate-100 transition focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            value={formState.team2Id}
            onChange={handleFieldChange('team2Id')}
            disabled={isUpdating || teamOptions.length === 0}
            required
          >
            <option value="" disabled>
              チームを選択
            </option>
            {teamOptions.map(([teamId, teamName]) => (
              <option key={teamId} value={teamId}>
                {teamName}
              </option>
            ))}
          </select>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-200">
              自チーム（記録対象）を選択
            </p>
            <span className="text-xs text-slate-500">ホーム / アウェイ</span>
          </div>

          {formState.team1Id && formState.team2Id ? (
            sameTeamSelected ? (
              <p className="text-sm text-amber-400">
                ホームとアウェイには異なるチームを設定してください。
              </p>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={`flex-1 rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    subjectTeamSide === 'home'
                      ? 'border-sky-500 bg-slate-900 ring-2 ring-sky-500/40'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                  onClick={() => setSubjectTeamSide('home')}
                  disabled={isUpdating}
                >
                  <p className="text-xs tracking-wide text-slate-500 uppercase">
                    ホーム
                  </p>
                  <p className="text-base font-semibold text-slate-100">
                    {homeTeamName}
                  </p>
                </button>

                <span className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
                  vs
                </span>

                <button
                  type="button"
                  className={`flex-1 rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    subjectTeamSide === 'away'
                      ? 'border-sky-500 bg-slate-900 ring-2 ring-sky-500/40'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                  onClick={() => setSubjectTeamSide('away')}
                  disabled={isUpdating}
                >
                  <p className="text-xs tracking-wide text-slate-500 uppercase">
                    アウェイ
                  </p>
                  <p className="text-base font-semibold text-slate-100">
                    {awayTeamName}
                  </p>
                </button>
              </div>
            )
          ) : (
            <p className="text-sm text-slate-500">
              先にホーム/アウェイチームを選択してください。
            </p>
          )}

          {hasSubjectChanged ? (
            <p className="text-xs text-amber-400">
              自チームを変更すると、現在のフォーメーションとスタメン設定はリセットされます。
            </p>
          ) : null}
        </section>

        {formError ? (
          <p className="text-sm text-rose-400" role="alert">
            {formError}
          </p>
        ) : null}
      </section>

      <footer className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={isUpdating}
        >
          キャンセル
        </Button>
        <Button type="submit" disabled={isSaveDisabled}>
          {isUpdating ? '保存中…' : '保存'}
        </Button>
      </footer>
    </form>
  );
};
