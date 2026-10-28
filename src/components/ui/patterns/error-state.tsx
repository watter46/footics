import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title?: string;
  message: string;
  code?: string;
  onRetry?: () => void;
  retryLabel?: string;
  backHref?: string;
  backLabel?: string;
  fullscreen?: boolean;
  className?: string;
}

export function ErrorState({
  title = 'An error occurred',
  message,
  code,
  onRetry,
  retryLabel = 'Retry',
  backHref,
  backLabel = 'Go Back',
  fullscreen = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        fullscreen
          ? 'fixed inset-0 z-50 bg-[#121214] flex flex-col items-center justify-center p-6 text-center'
          : 'rounded-[10px] border border-white/[0.08] bg-[#18181B] p-8 flex flex-col items-center justify-center text-center',
        className,
      )}
    >
      <div className="p-3 rounded-full bg-[#EB3B5A]/10 border border-[#EB3B5A]/20 text-[#EB3B5A] flex items-center justify-center">
        <AlertTriangle className="size-8" />
      </div>
      <h3 className="text-sm font-semibold text-white mt-3 mb-1">{title}</h3>
      <p className="text-xs text-[#A1A1AA] max-w-sm mb-4">{message}</p>
      {code && (
        <code className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-[#A1A1AA] border border-white/[0.08] mb-4">
          {code}
        </code>
      )}
      {(onRetry || backHref) && (
        <div className="flex items-center gap-2 mt-1">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3.5 py-1.5 rounded-[6px] text-xs font-medium bg-[#FF8100] hover:bg-[#FFA336] text-white transition-colors cursor-pointer"
            >
              {retryLabel}
            </button>
          )}
          {backHref && (
            <a
              href={backHref}
              className="px-3.5 py-1.5 rounded-[6px] text-xs font-medium text-[#A1A1AA] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors inline-block"
            >
              {backLabel}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
