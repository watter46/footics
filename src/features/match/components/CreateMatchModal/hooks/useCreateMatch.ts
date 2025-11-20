import { useState, useMemo, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useMatchRepository } from '@/features/match/hooks/useMatchRepository';
import { useTeamRepository } from '@/features/match/hooks/useTeamRepository';
import { toast } from '@/features/toast/toast-store';

type SubjectTeamSide = 'home' | 'away' | null;

export const useCreateMatch = (onClose?: () => void) => {
  const router = useRouter();
  const { createMatch } = useMatchRepository();
  const { useAllTeams } = useTeamRepository();

  const teams = useAllTeams();

  const [matchDate, setMatchDate] = useState('');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [subjectTeamSide, setSubjectTeamSide] = useState<SubjectTeamSide>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      !isDuplicateSelection &&
      !isSubmitting
  );

  const resetForm = () => {
    setMatchDate('');
    setHomeTeamId('');
    setAwayTeamId('');
    setSubjectTeamSide(null);
    setIsSubmitting(false);
  };

  const handleCreateMatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !subjectTeamSide) return;

    setIsSubmitting(true);
    try {
      const subjectTeamId =
        subjectTeamSide === 'home' ? Number(homeTeamId) : Number(awayTeamId);

      const createdMatchId = await createMatch({
        date: matchDate,
        team1Id: Number(homeTeamId),
        team2Id: Number(awayTeamId),
        subjectTeamId,
      });

      resetForm();
      onClose?.();

      if (typeof createdMatchId === 'number') {
        router.push(`/matches/${createdMatchId}`);
      }
    } catch (error) {
      console.error('Failed to create match:', error);
      toast.error('試合作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
      resetForm,
    },
    handleCreateMatch,
  };
};
