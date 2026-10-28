'use client';

import { XIcon } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Dialog({
  open,
  onClose,
  children,
  className,
  size = 'lg',
}: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className={cn(
          'w-full bg-[#222226] border border-white/[0.08] rounded-[10px] shadow-2xl p-6 space-y-5 text-white',
          sizeClasses[size],
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export interface DialogHeaderProps extends React.ComponentProps<'div'> {
  title?: string;
  onClose?: () => void;
  accentColor?: string;
}

export function DialogHeader({
  title,
  onClose,
  accentColor = '#FF8100',
  children,
  className,
  ...props
}: DialogHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-b border-white/[0.07] pb-3',
        className,
      )}
      {...props}
    >
      {title ? (
        <div className="flex items-center gap-2">
          <span
            className="size-2 rounded-full shrink-0"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 0 6px ${accentColor}`,
            }}
          />
          <h4 className="text-sm font-bold text-white">{title}</h4>
        </div>
      ) : (
        children
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="text-[#71717A] hover:text-white p-1 rounded-[4px] hover:bg-white/[0.05] transition-colors cursor-pointer"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<'h4'>) {
  return (
    <h4 className={cn('text-sm font-bold text-white', className)} {...props} />
  );
}

export function DialogContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('text-xs text-[#A1A1AA] leading-relaxed', className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 border-t border-white/[0.07] pt-3',
        className,
      )}
      {...props}
    />
  );
}
