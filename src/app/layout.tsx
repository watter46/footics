/* eslint-disable react-refresh/only-export-components -- Next.js layout exports metadata alongside the root component */
import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { ToastContainer } from '@/features/toast/toast-container';

export const metadata: Metadata = {
  title: 'Footics Tactical Memo',
  description:
    'サッカーの試合をリアルタイムで記録し、戦術的に振り返るための Phase1 プロトタイプ。',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="ja" data-scroll-behavior="smooth">
    <body>
      <div className="fixed inset-0 -z-10" style={{
        minHeight: '100vh',
        backgroundColor: 'hsla(0,0%,0%,1)',
        background: `
          radial-gradient(ellipse 90% 60% at 80% 0%, hsla(210, 55%, 47%, 0.2) 0px, transparent 90%),
          radial-gradient(ellipse 70% 70% at 85% 0%, hsla(210, 55%, 47%, 0.2) 0px, transparent 60%),
          radial-gradient(ellipse 65% 100% at 100% 45%, hsla(210, 55%, 47%, 0.1) 0px, transparent 50%),

          radial-gradient(ellipse 80% 45% at 10% 80%, hsla(258, 62%, 45%, 0.1) 0px, transparent 40%),
          radial-gradient(ellipse 90% 15% at 40% 100%, hsla(19, 89%, 43%, 0.2) 0px, transparent 40%),
          radial-gradient(circle at 93% 100%, hsla(19, 89%, 43%, 0.1) 0px, transparent 15%)
        `,
        color: 'hsl(var(--foreground))',
        fontFamily: `'Inter', system-ui, -apple-system, BlinkMacSystemFont,
        'Segoe UI', sans-serif`,
      }} />

      <SiteHeader />
      {children}
      <ToastContainer />
    </body>
  </html>
);

export default RootLayout;
