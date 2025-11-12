/* eslint-disable react-refresh/only-export-components -- Next.js layout exports metadata alongside the root component */
import type { Metadata } from 'next';
import './globals.css';
import { ToastContainer } from '@/features/toast/toast-container';

export const metadata: Metadata = {
  title: 'Footics Tactical Memo',
  description:
    'サッカーの試合をリアルタイムで記録し、戦術的に振り返るための Phase1 プロトタイプ。',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="ja" data-scroll-behavior="smooth">
    <body>
      {children}
      <ToastContainer />
    </body>
  </html>
);

export default RootLayout;
