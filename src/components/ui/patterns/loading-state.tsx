import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PageLoadingProps {
  message?: string;
  className?: string;
}

export function PageLoading({
  message = 'Loading...',
  className,
}: PageLoadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[240px] w-full gap-3 text-center',
        className,
      )}
    >
      <Loader2 className="size-8 animate-spin text-[#FF8100]" />
      {message && <p className="text-xs text-[#A1A1AA]">{message}</p>}
    </div>
  );
}

export interface InlineLoadingProps {
  message?: string;
  className?: string;
}

export function InlineLoading({ message, className }: InlineLoadingProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs text-[#A1A1AA]',
        className,
      )}
    >
      <Loader2 className="size-4 animate-spin text-[#FF8100]" />
      {message && <span>{message}</span>}
    </div>
  );
}
