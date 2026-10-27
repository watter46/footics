/**
 * app/tactical/page.tsx
 * 統合タクティカルキャンバス ページ
 */

import type { Metadata } from 'next';
import nextDynamic from 'next/dynamic';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Tactical Canvas — Footics',
  description: '統合タクティカルキャンバス',
};

export const dynamic = 'force-dynamic';

const DynamicTacticalUnifiedPage = nextDynamic(
  () =>
    import('@/features/tactical-unified').then((m) => m.TacticalUnifiedPage),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0a0a0a] text-sm text-zinc-500 select-none">
        <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
        <span>読み込み中...</span>
      </div>
    ),
  },
);

export interface TacticalPageProps {
  searchParams?:
    | Promise<{ [key: string]: string | string[] | undefined }>
    | { [key: string]: string | string[] | undefined };
}

// Full-screen canvas — body overflow hidden は globals.css で管理
export default async function TacticalPage({
  searchParams,
}: TacticalPageProps) {
  let resolvedSearchParams:
    | { [key: string]: string | string[] | undefined }
    | undefined;
  try {
    resolvedSearchParams = searchParams
      ? await Promise.resolve(searchParams)
      : undefined;
  } catch {
    resolvedSearchParams = undefined;
  }

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
      <DynamicTacticalUnifiedPage
        initialMatchId={matchId}
        initialMinute={minute}
      />
    </Suspense>
  );
}
