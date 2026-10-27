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
  xs: 'h-6 px-2 text-[11px] font-medium rounded-md gap-1',
  sm: 'h-7 px-2.5 text-xs font-medium rounded-md gap-1.5',
  md: 'h-8 px-3 text-sm font-medium rounded-lg gap-2',
};

const variantStyles: Record<
  NonNullable<ActionButtonProps['variant']>,
  string
> = {
  default:
    'bg-white/10 hover:bg-white/15 text-white/90 hover:text-white border border-white/10',
  primary: 'bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-xs',
  outline:
    'border border-white/15 hover:bg-white/5 text-white/80 hover:text-white',
  ghost: 'text-white/70 hover:text-white hover:bg-white/10',
  danger:
    'bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30',
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
        'inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none',
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
