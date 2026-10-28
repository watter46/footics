import { ChevronLeft, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import logoName from '@/app/logo-name.png';
import { TeamsDropdown } from '@/components/layout/TeamsDropdown';
import { GlobalDataManagement, ImportMatchButton } from '@/features/management';
import { TeamSquadClient } from '@/features/teams';

interface TeamPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

export default async function TeamDynamicPage({ params }: TeamPageProps) {
  const { teamId } = await params;

  return (
    <div className="min-h-screen bg-[#0D0D0E] text-[#EDEDED] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#121214] border-b border-white/[0.07]">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold text-[#A1A1AA] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] transition-colors"
            >
              <ChevronLeft className="size-3.5" />
              <span>Matches</span>
            </Link>

            <Link href="/" className="flex items-center">
              <Image
                src={logoName}
                alt="Footics Match Center"
                width={140}
                height={35}
                priority
                className="h-9 w-auto opacity-90 hover:opacity-100 transition-opacity"
              />
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/tactical"
              className="inline-flex items-center justify-center whitespace-nowrap outline-none select-none cursor-pointer h-7 px-2.5 text-xs font-medium rounded-[8px] gap-1.5 [&_svg]:size-3.5 btn-guideline-secondary btn-interactive active:scale-[0.98]"
              title="Tactical 統合キャンバスを開く"
            >
              <ExternalLink className="size-3.5 text-[#FF8A00]" />
              <span>Tactical</span>
            </Link>
            <TeamsDropdown />
            <ImportMatchButton />
            <GlobalDataManagement />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <TeamSquadClient teamId={teamId} />
      </main>
    </div>
  );
}
