'use client';

import type * as React from 'react';
import { cn } from '@/lib/utils';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: React.Ref<HTMLButtonElement>;
  variant?: 'ghost' | 'subtle' | 'primary' | 'danger';
  size?: 'xs' | 'sm' | 'md';
  isActive?: boolean;
}

const sizeStyles: Record<NonNullable<IconButtonProps['size']>, string> = {
  xs: 'size-6 p-1 text-xs rounded-[6px]',
  sm: 'size-7 p-1.5 text-xs rounded-[6px]',
  md: 'size-8 p-2 text-sm rounded-[8px]',
};

const variantStyles: Record<NonNullable<IconButtonProps['variant']>, string> = {
  ghost: 'text-[#A1A1AA] hover:text-white hover:bg-white/[0.05]',
  subtle:
    'bg-[#18181B] hover:bg-[#222226] border border-white/[0.07] text-[#A1A1AA] hover:text-white',
  primary:
    'bg-[#FF5500] hover:bg-[#ff6a1f] text-white shadow-[0_0_12px_rgba(255,85,0,0.35)]',
  danger: 'text-[#EB3B5A] hover:text-[#ff5270] hover:bg-[#EB3B5A]/15',
};

export function IconButton({
  ref,
  className,
  variant = 'ghost',
  size = 'sm',
  isActive = false,
  type = 'button',
  disabled,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      data-active={isActive ? 'true' : undefined}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF5500]/50 disabled:pointer-events-none disabled:opacity-35 cursor-pointer select-none active:scale-95',
        sizeStyles[size],
        variantStyles[variant],
        isActive &&
          'bg-[#FF5500]/15 text-[#FF5500] border border-[#FF5500]/30 shadow-[0_0_10px_rgba(255,85,0,0.25)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
