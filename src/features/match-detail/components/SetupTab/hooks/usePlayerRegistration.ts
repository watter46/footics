import { useCallback, useState, type FormEvent } from 'react';

import { db } from '@/lib/db';
import { toast } from '@/features/toast/toast-store';

export interface PlayerFormState {
  name: string;
  number: string;
  position: string;
}

const INITIAL_FORM: PlayerFormState = {
  name: '',
  number: '',
  position: '',
};

interface UsePlayerRegistrationParams {
  teamId: number;
}

export const usePlayerRegistration = ({
  teamId,
}: UsePlayerRegistrationParams) => {
  const [formState, setFormState] = useState<PlayerFormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormChange = useCallback(
    (field: keyof PlayerFormState, value: string) => {
      setFormState(prev => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleFormSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedName = formState.name.trim();
      const trimmedNumber = formState.number.trim();
      const trimmedPosition = formState.position.trim();

      if (!trimmedName || !trimmedNumber) {
        toast.error('選手名と背番号を入力してください');
        return;
      }

      const parsedNumber = Number.parseInt(trimmedNumber, 10);
      if (!Number.isFinite(parsedNumber)) {
        toast.error('背番号は数値で入力してください');
        return;
      }

      setIsSubmitting(true);
      try {
        await db.temp_players.add({
          teamId,
          name: trimmedName,
          number: parsedNumber,
          position: trimmedPosition,
        });
        toast.success('選手を登録しました');
        setFormState(INITIAL_FORM);
      } catch (error) {
        console.error('Failed to add player:', error);
        toast.error('選手の登録に失敗しました');
      } finally {
        setIsSubmitting(false);
      }
    },
    [formState.name, formState.number, formState.position, teamId]
  );

  return {
    formState,
    isSubmitting,
    handleFormChange,
    handleFormSubmit,
  };
};
