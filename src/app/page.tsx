'use client';


import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { CreateMatchModal } from '@/features/match/components/CreateMatchModal';
import { MatchList } from '@/features/match/components/MatchList';
import { toast } from '@/features/toast/toast-store';

const HomePageContent = () => {
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorMessage = searchParams.get('error');
    if (errorMessage) {
      toast.error(decodeURIComponent(errorMessage));
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  return (
    <main className="container mx-auto min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">試合一覧</h1>
          <p className="mt-2 text-sm text-slate-400">メモした試合の履歴と管理</p>
        </div>
        <CreateMatchModal />
      </div>
      <MatchList />
    </main>
  );
};

const HomePage = () => (
  <Suspense fallback={null}>
    <HomePageContent />
  </Suspense>
);

export default HomePage;
