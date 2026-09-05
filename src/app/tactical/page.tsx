/**
 * app/tactical/page.tsx
 * 統合タクティカルキャンバス ページ
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TacticalUnifiedPage } from '@/features/tactical-unified';

export const metadata: Metadata = {
  title: 'Tactical Canvas — Footics',
  description: '統合タクティカルキャンバス',
};

export interface TacticalPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Full-screen canvas — body overflow hidden は globals.css で管理
export default async function TacticalPage({
  searchParams,
}: TacticalPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawMatchId = resolvedSearchParams?.matchId;
  const rawMinute = resolvedSearchParams?.minute;

  const matchId =
    typeof rawMatchId === 'string'
      ? rawMatchId
      : Array.isArray(rawMatchId)
        ? rawMatchId[0]
        : undefined;

  const minuteStr =
    typeof rawMinute === 'string'
      ? rawMinute
      : Array.isArray(rawMinute)
        ? rawMinute[0]
        : undefined;

  const minute =
    minuteStr !== undefined && !Number.isNaN(Number(minuteStr))
      ? Number(minuteStr)
      : undefined;

  return (
    <Suspense fallback={null}>
      <TacticalUnifiedPage initialMatchId={matchId} initialMinute={minute} />
    </Suspense>
  );
}
