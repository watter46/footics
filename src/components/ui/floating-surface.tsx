'use client';

import type * as React from 'react';
import { cn } from '@/lib/utils';

export interface FloatingSurfaceProps
  extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
  variant?: 'floating' | 'subtle' | 'solid';
  density?: 'compact' | 'normal' | 'loose';
}

const variantStyles: Record<
  NonNullable<FloatingSurfaceProps['variant']>,
  string
> = {
  floating: 'bg-[#18181B] border border-white/[0.07] shadow-2xl rounded-[10px]',
  subtle: 'bg-white/[0.03] border border-white/[0.05] rounded-[8px]',
  solid: 'bg-[#121214] border border-white/[0.07] rounded-[10px]',
};

const densityStyles: Record<
  NonNullable<FloatingSurfaceProps['density']>,
  string
> = {
  compact: 'p-1.5',
  normal: 'p-3',
  loose: 'p-4',
};

export function FloatingSurface({
  ref,
  className,
  variant = 'floating',
  density,
  children,
  ...props
}: FloatingSurfaceProps) {
  return (
    <div
      ref={ref}
      className={cn(
        variantStyles[variant],
        density ? densityStyles[density] : undefined,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
