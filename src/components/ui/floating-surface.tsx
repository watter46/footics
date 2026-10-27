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
  floating:
    'bg-[#090d16]/95 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl',
  subtle:
    'bg-white/[0.03] backdrop-blur-xs border border-white/[0.08] rounded-lg',
  solid: 'bg-[#090d16] border border-white/10 rounded-xl',
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
