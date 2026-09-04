import type { RefObject } from 'react';
import type { Match } from '@/types';

export interface CacheRecoveryViewProps {
  metadata?: Match | null;
  error?: string | null;
  cacheMissing?: boolean;
  isRestoring: boolean;
  restoreInputRef: RefObject<HTMLInputElement | null>;
  onRestoreCache: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
