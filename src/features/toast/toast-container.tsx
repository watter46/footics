'use client';

import { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useToastStore, type ToastType } from '@/features/toast/toast-store';

const icons: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const styles: Record<
  ToastType,
  { container: string; icon: string; text: string }
> = {
  success: {
    container: 'border-emerald-500/30 bg-emerald-500/10',
    icon: 'text-emerald-300',
    text: 'text-emerald-100',
  },
  error: {
    container: 'border-rose-500/30 bg-rose-500/10',
    icon: 'text-rose-300',
    text: 'text-rose-100',
  },
  info: {
    container: 'border-sky-500/30 bg-sky-500/10',
    icon: 'text-sky-300',
    text: 'text-sky-100',
  },
};

export const ToastContainer = () => {
  const toasts = useToastStore(state => state.toasts);
  const removeToast = useToastStore(state => state.removeToast);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && toasts.length > 0) {
        removeToast(toasts[toasts.length - 1].id);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [removeToast, toasts]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map(toast => {
        const Icon = icons[toast.type];
        const style = styles[toast.type];

        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-md',
              style.container
            )}
          >
            <Icon className={cn('h-5 w-5 shrink-0', style.icon)} />
            <p className={cn('flex-1 text-sm', style.text)}>{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className={cn(
                'shrink-0 rounded-md p-1 transition-colors hover:bg-white/10',
                style.text
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
