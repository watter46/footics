import { AlertCircle, X } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';

interface MemoOverlayFloatingErrorProps {
  error: string | undefined;
  onClear: () => void;
}

export function MemoOverlayFloatingError({
  error,
  onClear,
}: MemoOverlayFloatingErrorProps) {
  if (!error) return null;

  return (
    <div className="absolute inset-x-0 bottom-12 p-3 bg-red-950/90 border-y border-red-500/30 flex items-center gap-3 backdrop-blur-lg animate-in slide-in-from-bottom-2">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      <p className="text-xs text-red-200 font-bold leading-tight">{error}</p>
      <IconButton
        type="button"
        variant="ghost"
        size="xs"
        onClick={onClear}
        className="ml-auto text-red-500 hover:text-red-400 hover:bg-red-500/10"
        aria-label="Clear error"
      >
        <X className="w-4 h-4" />
      </IconButton>
    </div>
  );
}
