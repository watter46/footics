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
  xs: 'size-6 p-1 text-xs',
  sm: 'size-7 p-1.5 text-xs',
  md: 'size-8 p-2 text-sm',
};

const variantStyles: Record<NonNullable<IconButtonProps['variant']>, string> = {
  ghost: 'text-white/70 hover:text-white hover:bg-white/10',
  subtle:
    'bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white',
  primary: 'bg-blue-600 hover:bg-blue-500 text-white',
  danger: 'text-red-400 hover:text-red-300 hover:bg-red-500/20',
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
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none',
        sizeStyles[size],
        variantStyles[variant],
        isActive && 'bg-white/15 text-white border-white/20',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
