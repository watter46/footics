'use client';

import type * as React from 'react';
import { cn } from '@/lib/utils';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: React.Ref<HTMLButtonElement>;
  variant?: 'ghost' | 'subtle' | 'primary' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isActive?: boolean;
}

const sizeStyles: Record<NonNullable<IconButtonProps['size']>, string> = {
  xs: 'size-6 p-1 text-xs rounded-[6px] [&_svg]:size-3',
  sm: 'size-7 p-1.5 text-xs rounded-[6px] [&_svg]:size-3.5',
  md: 'size-8 p-2 text-sm rounded-[8px] [&_svg]:size-4',
  lg: 'size-9 p-2.5 text-base rounded-[8px] [&_svg]:size-5',
};

const variantStyles: Record<NonNullable<IconButtonProps['variant']>, string> = {
  ghost: 'btn-guideline-ghost',
  subtle:
    'bg-[#18181B] hover:bg-[#222226] border border-white/[0.07] text-[#A1A1AA] hover:text-white',
  primary: 'btn-guideline-primary',
  danger: 'btn-guideline-danger',
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
        'inline-flex items-center justify-center font-medium outline-none select-none cursor-pointer disabled:pointer-events-none disabled:opacity-35 btn-interactive active:scale-95',
        sizeStyles[size],
        variantStyles[variant],
        isActive &&
          'bg-[#FF8100]/24 text-[#FFA336] border border-[#FF8100]/80 ring-1 ring-[#FF8100]/40 shadow-[0_0_14px_rgba(255,129,0,0.5)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
