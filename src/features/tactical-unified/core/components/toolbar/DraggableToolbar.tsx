'use client';

import type React from 'react';

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
    <div
      style={{
        right: 'var(--toolbar-right, 12px)',
        transform: 'var(--toolbar-transform, translateY(-50%))',
        ...style,
      }}
      className={`absolute top-1/2 z-40 max-h-[calc(100%-1.5rem)] overflow-y-auto no-scrollbar flex flex-col items-center gap-1 p-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 shadow-2xl select-none ${className}`}
    >
      {children}
    </div>
  );
}

export const DraggableToolbar = FixedToolbar;
