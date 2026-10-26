import { use } from 'react';
import { SharePageClientView } from '@/features/tactical-unified/components/share-page-client-view';

export interface StandaloneExportSharePageProps {
  params?: Promise<{ shareId: string }>;
}

export default function StandaloneExportSharePage(
  props?: StandaloneExportSharePageProps,
) {
  const resolvedParams = props?.params ? use(props.params) : undefined;
  return <SharePageClientView shareId={resolvedParams?.shareId} />;
}
