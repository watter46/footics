import Image from 'next/image';
import { ImportMatchButton } from '@/components/features/ImportMatchButton';
import { MatchListClient } from '@/components/features/MatchListClient';
import type { MatchSummary } from '@/types';
import logoName from './logo-name.png';

export default async function Home() {
  const matches: MatchSummary[] = [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Image
              src={logoName}
              alt="Footics Match Center"
              width={160}
              height={40}
              priority
              className="h-12 w-auto"
            />
          </div>
          <ImportMatchButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10 space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            Matches
          </h1>
          <p className="text-slate-500 text-sm">
            Select a match to start analysis or import new data
          </p>
        </div>

        <MatchListClient matches={matches} />
      </main>
    </div>
  );
}
