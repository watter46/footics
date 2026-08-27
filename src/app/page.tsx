import Image from 'next/image';
import Link from 'next/link';
import {
  GlobalDataManagement,
  ImportMatchButton,
} from '@/components/features/management';
import { MatchListClient } from '@/components/features/match';
import { TeamsDropdown } from '@/components/layout/TeamsDropdown';
import type { Match } from '@/types';
import logoName from './logo-name.png';

export default async function Home() {
  const matches: Match[] = [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center shrink-0">
            <Image
              src={logoName}
              alt="Footics Match Center"
              width={160}
              height={40}
              priority
              className="h-8 sm:h-12 w-auto"
            />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar py-0.5">
            <Link
              href="/players"
              className="px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 hover:border-slate-600 transition-all flex items-center gap-1.5 shrink-0"
            >
              Players
            </Link>
            <TeamsDropdown />
            <ImportMatchButton />
            <GlobalDataManagement />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
            Matches
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Select a match to start analysis or import new data
          </p>
        </div>

        <MatchListClient matches={matches} />
      </main>
    </div>
  );
}
