'use client';

import { TacticalUnifiedPage } from '@/features/tactical-unified';
import { useTacticalMatchInit } from '@/features/tactical-unified/hooks/use-tactical-match-init';

export interface TacticalClientPageProps {
  initialMatchId?: string;
  initialMinute?: number;
}

export function TacticalClientPage({
  initialMatchId,
  initialMinute,
}: TacticalClientPageProps) {
  const { isLoading, matchId, initialState } = useTacticalMatchInit({
    initialMatchId,
    initialMinute,
    injectToStore: false,
  });

  if (isLoading) {
    return (
      <div
        data-testid="tactical-init-loading"
        className="h-[100dvh] w-screen bg-[#0D0D0E]"
      />
    );
  }

  return (
    <TacticalUnifiedPage
      initialMatchId={matchId ?? initialMatchId}
      initialMinute={initialMinute}
      initialState={initialState}
    />
  );
}
