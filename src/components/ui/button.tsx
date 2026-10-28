'use client';

import type * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: React.Ref<HTMLButtonElement>;
  variant?:
    | 'primary'
    | 'play'
    | 'secondary'
    | 'danger'
    | 'ghost'
    | 'outline'
    | 'default';
  size?:
    | 'xs'
    | 'sm'
    | 'md'
    | 'lg'
    | 'icon-xs'
    | 'icon-sm'
    | 'icon'
    | 'icon-lg'
    | 'default';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isActive?: boolean;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'btn-guideline-primary',
  play: 'btn-guideline-play',
  secondary: 'btn-guideline-secondary',
  default: 'btn-guideline-secondary',
  danger: 'btn-guideline-danger',
  ghost: 'btn-guideline-ghost',
  outline:
    'bg-transparent border border-white/[0.07] text-[#A1A1AA] hover:text-white hover:bg-white/[0.05]',
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'h-6 px-2 text-[11px] font-medium rounded-[6px] gap-1 [&_svg]:size-3',
  sm: 'h-7 px-2.5 text-xs font-medium rounded-[8px] gap-1.5 [&_svg]:size-3.5',
  md: 'h-8 px-3 text-xs font-semibold rounded-[8px] gap-2 [&_svg]:size-4',
  default: 'h-8 px-3 text-xs font-semibold rounded-[8px] gap-2 [&_svg]:size-4',
  lg: 'h-9 px-4 text-sm font-semibold rounded-[8px] gap-2 [&_svg]:size-4',
  'icon-xs': 'size-6 p-1 rounded-[6px] [&_svg]:size-3',
  'icon-sm': 'size-7 p-1.5 rounded-[6px] [&_svg]:size-3.5',
  icon: 'size-8 p-2 rounded-[8px] [&_svg]:size-4',
  'icon-lg': 'size-9 p-2.5 rounded-[8px] [&_svg]:size-4',
};

export function Button({
  ref,
  className,
  variant = 'secondary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isActive = false,
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      data-active={isActive ? 'true' : undefined}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap outline-none select-none cursor-pointer disabled:pointer-events-none disabled:opacity-35 btn-interactive active:scale-[0.98]',
        variantStyles[variant],
        sizeStyles[size],
        isActive &&
          'bg-[#FF8100]/24 text-[#FFA336] border border-[#FF8100]/80 ring-1 ring-[#FF8100]/40 shadow-[0_0_14px_rgba(255,129,0,0.5)]',
        className,
      )}
      {...props}
    >
      {icon && iconPosition === 'left' && (
        <span className="inline-flex shrink-0">{icon}</span>
      )}
      {children}
      {icon && iconPosition === 'right' && (
        <span className="inline-flex shrink-0">{icon}</span>
      )}
    </button>
  );
}
