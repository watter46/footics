'use client';

import type React from 'react';
import { FloatingSurface } from '@/components/ui/floating-surface';
import { cn } from '@/lib/utils';

export interface FixedToolbarProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export type DraggableToolbarProps = FixedToolbarProps;

export function FixedToolbar({
  children,
  className = '',
  style,
}: FixedToolbarProps) {
  return (
    <FloatingSurface
      variant="floating"
      density="compact"
      style={{
        right: 'var(--toolbar-right, 12px)',
        transform: 'var(--toolbar-transform, translateY(-50%))',
        ...style,
      }}
      className={cn(
        'absolute top-1/2 z-40 max-h-[calc(100%-1.5rem)] overflow-y-auto no-scrollbar flex flex-col items-center gap-1 select-none',
        className,
      )}
    >
      {children}
    </FloatingSurface>
  );
}

export const DraggableToolbar = FixedToolbar;
