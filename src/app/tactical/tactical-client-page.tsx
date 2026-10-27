'use client';

import { TacticalUnifiedPage } from '@/features/tactical-unified';

export interface TacticalClientPageProps {
  initialMatchId?: string;
  initialMinute?: number;
}

export function TacticalClientPage({
  initialMatchId,
  initialMinute,
}: TacticalClientPageProps) {
  return (
    <TacticalUnifiedPage
      initialMatchId={initialMatchId}
      initialMinute={initialMinute}
    />
  );
}
