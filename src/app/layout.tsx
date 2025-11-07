import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Footics Tactical Memo',
  description:
    'サッカーの試合をリアルタイムで記録し、戦術的に振り返るための Phase1 プロトタイプ。',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="ja">
    <body>{children}</body>
  </html>
);

export default RootLayout;
