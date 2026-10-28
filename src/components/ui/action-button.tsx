'use client';

import type * as React from 'react';
import { cn } from '@/lib/utils';

export interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: React.Ref<HTMLButtonElement>;
  variant?: 'default' | 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md';
  icon?: React.ReactNode;
}

const sizeStyles: Record<NonNullable<ActionButtonProps['size']>, string> = {
  xs: 'h-6 px-2 text-[11px] font-medium rounded-[6px] gap-1',
  sm: 'h-7 px-2.5 text-xs font-semibold rounded-[8px] gap-1.5',
  md: 'h-8 px-3.5 text-xs font-bold rounded-[8px] gap-2',
};

const variantStyles: Record<
  NonNullable<ActionButtonProps['variant']>,
  string
> = {
  default:
    'bg-[#18181B] hover:bg-[#222226] text-[#F4F4F5] border border-white/[0.07]',
  primary:
    'bg-[#FF5500] hover:bg-[#ff6a1f] text-white font-semibold shadow-[0_0_14px_rgba(255,85,0,0.4)]',
  outline:
    'border border-white/[0.07] hover:bg-white/[0.05] text-[#A1A1AA] hover:text-white',
  ghost: 'text-[#A1A1AA] hover:text-white hover:bg-white/[0.05]',
  danger:
    'bg-[#EB3B5A]/15 hover:bg-[#EB3B5A]/25 text-[#EB3B5A] border border-[#EB3B5A]/30',
};

export function ActionButton({
  ref,
  className,
  variant = 'default',
  size = 'sm',
  icon,
  type = 'button',
  disabled,
  children,
  ...props
}: ActionButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF5500]/50 disabled:pointer-events-none disabled:opacity-35 cursor-pointer select-none active:scale-[0.98]',
        sizeStyles[size],
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
