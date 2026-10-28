'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils';

export { DialogPrimitive };
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export function DialogBackdrop({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Backdrop>) {
  return (
    <DialogPrimitive.Backdrop
      className={cn(
        'fixed inset-0 z-50 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in-0',
        className,
      )}
      {...props}
    />
  );
}

export function DialogPopup({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Popup>) {
  return (
    <DialogPrimitive.Popup
      className={cn(
        'w-full bg-[#222226] border border-white/[0.08] rounded-[10px] shadow-2xl p-6 space-y-5 text-white animate-in zoom-in-95 duration-150 focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-xs text-[#A1A1AA] leading-relaxed', className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-sm font-bold text-white', className)}
      {...props}
    />
  );
}

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
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose?.();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogBackdrop />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <DialogPopup className={cn(sizeClasses[size], className)}>
            {children}
          </DialogPopup>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
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
          <DialogTitle>{title}</DialogTitle>
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
