import { ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { TeamsDropdown } from '@/components/layout/TeamsDropdown';
import { Button } from '@/components/ui/button';
import { GlobalDataManagement, ImportMatchButton } from '@/features/management';
import { MatchListClient } from '@/features/match';
import type { Match } from '@/types';
import logoName from './logo-name.png';

export default async function Home() {
  const matches: Match[] = [];

  return (
    <div className="min-h-screen bg-[#0D0D0E] text-[#F4F4F5] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-[#121214]/90 backdrop-blur-md border-b border-white/[0.07]">
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
          <div className="flex items-center gap-1.5 sm:gap-2.5 py-0.5">
            <Link href="/tactical" title="Tactical 統合キャンバスを開く">
              <Button
                variant="secondary"
                size="sm"
                icon={<ExternalLink className="w-3.5 h-3.5 text-[#00A8FF]" />}
                className="font-bold"
              >
                Tactical
              </Button>
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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F4F4F5]">
            Matches
          </h1>
          <p className="text-[#71717A] text-xs sm:text-sm">
            Select a match to start analysis or import new data
          </p>
        </div>

        <MatchListClient matches={matches} />
      </main>
    </div>
  );
}
