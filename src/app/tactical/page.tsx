/**
 * app/tactical/page.tsx
 * 統合タクティカルキャンバス ページ
 */

import type { Metadata } from 'next';
import { TacticalUnifiedPage } from '@/components/features/tactical-unified';

export const metadata: Metadata = {
  title: 'Tactical Canvas — Footics',
  description: '統合タクティカルキャンバス',
};

// Full-screen canvas — body overflow hidden は globals.css で管理
export default function TacticalPage() {
  return <TacticalUnifiedPage />;
}
