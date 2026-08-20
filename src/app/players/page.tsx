import { ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  GlobalDataManagement,
  ImportMatchButton,
} from '@/components/features/management';
import { ChelseaSquadClient } from '@/components/features/teams/ChelseaSquadClient';
import { TeamsDropdown } from '@/components/layout/TeamsDropdown';
import logoName from '../logo-name.png';

export default function PlayersPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
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
              href="/players"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600/20 text-blue-300 border border-blue-500/60 transition-all"
            >
              Players
            </Link>
            <TeamsDropdown />
            <ImportMatchButton />
            <GlobalDataManagement />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <ChelseaSquadClient />
      </main>
    </div>
  );
}
