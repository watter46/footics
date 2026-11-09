import { use } from 'react';
import { SharePageClientView } from '@/features/tactical-unified/components/share-page-client-view';

export interface StandaloneExportSharePageProps {
  params?: Promise<{ shareId: string }>;
}

export default function StandaloneExportSharePage({
  params,
}: StandaloneExportSharePageProps) {
  const resolvedParams = params ? use(params) : undefined;
  return <SharePageClientView shareId={resolvedParams?.shareId} />;
}
