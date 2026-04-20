import { Check } from 'lucide-react';
import type React from 'react';
import { Z_INDEX } from '../../constants';
import { cn } from '../../utils/cn';

interface SuccessToastProps {
  message: string;
  isVisible: boolean;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({
  message,
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed top-6 right-6 flex items-center gap-3 bg-slate-900 border border-emerald-500/30 px-4 py-3 rounded-lg shadow-2xl animate-in slide-in-from-right-4 fade-in duration-300',
      )}
      style={{ zIndex: Z_INDEX.TOAST }}
    >
      <div
        className={cn(
          'w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20',
        )}
      >
        <Check className={cn('w-3 h-3 text-white')} strokeWidth={4} />
      </div>
      <p
        className={cn(
          'text-xs font-black text-slate-100 uppercase tracking-tighter',
        )}
      >
        {message}
      </p>
    </div>
  );
};
