import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { ToastContainer } from '@/features/toast/toast-container';

export const metadata: Metadata = {
  title: 'Footics Tactical Memo',
  description:
    'サッカーの試合をリアルタイムで記録し、戦術的に振り返るための Phase1 プロトタイプ。',
};

const navItems = [{ href: '/matches/new', label: '新規試合' }];

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="ja" data-scroll-behavior="smooth">
    <body className="relative min-h-screen bg-transparent text-slate-100 antialiased">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.15),transparent_60%)]" />
      <ToastContainer />
      <header className="border-b border-white/5 bg-slate-950/60 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-sky-300"
          >
            Footics
            <span className="hidden text-xs font-normal text-slate-400 sm:inline">
              Phase1
            </span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-slate-300">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-sky-300"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-2 py-12 sm:py-16">
        {children}
      </main>
      <footer className="border-t border-white/5 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Footics. Tactical Memo Prototype.
      </footer>
    </body>
  </html>
);

export default RootLayout;
