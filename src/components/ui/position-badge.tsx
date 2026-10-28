import type * as React from 'react';
import { cn } from '@/lib/utils';

export type PositionType = 'FW' | 'MID' | 'DF' | 'GK';

export interface PositionBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  ref?: React.Ref<HTMLSpanElement>;
  position: PositionType;
  label?: string;
  variant?: 'compact' | 'tag' | 'button';
  isActive?: boolean;
  onSelect?: () => void;
}

const positionStyles: Record<PositionType, string> = {
  FW: 'badge-pos-fw',
  MID: 'badge-pos-mid',
  DF: 'badge-pos-df',
  GK: 'badge-pos-gk',
};

const dotStyles: Record<PositionType, string> = {
  FW: 'bg-[#FF5252] shadow-[0_0_8px_rgba(239,68,68,0.5)]',
  MID: 'bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.5)]',
  DF: 'bg-[#60A5FA] shadow-[0_0_8px_rgba(59,130,246,0.5)]',
  GK: 'bg-[#FBBF24] shadow-[0_0_8px_rgba(245,158,11,0.5)]',
};

export function PositionBadge({
  ref,
  position,
  label,
  variant = 'tag',
  isActive = true,
  onSelect,
  className,
  ...props
}: PositionBadgeProps) {
  const displayLabel = label ?? position;

  if (variant === 'compact') {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs font-medium text-white/90',
          className,
        )}
        {...props}
      >
        <span
          className={cn('size-2 rounded-full shrink-0', dotStyles[position])}
        />
        <span>{displayLabel}</span>
      </span>
    );
  }

  if (variant === 'button') {
    return (
      <span
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect?.();
          }
        }}
        data-active={isActive ? 'true' : undefined}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-semibold cursor-pointer select-none transition-all active:scale-95',
          isActive
            ? positionStyles[position]
            : 'bg-[#18181B] border border-white/[0.07] text-[#71717A] hover:text-white hover:border-white/20',
          className,
        )}
        {...props}
      >
        <span
          className={cn('size-2 rounded-full shrink-0', dotStyles[position])}
        />
        <span>{displayLabel}</span>
      </span>
    );
  }

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold',
        positionStyles[position],
        className,
      )}
      {...props}
    >
      <span
        className={cn('size-1.5 rounded-full shrink-0', dotStyles[position])}
      />
      <span>{displayLabel}</span>
    </span>
  );
}
