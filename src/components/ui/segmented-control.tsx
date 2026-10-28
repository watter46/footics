'use client';

import type * as React from 'react';
import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ElementType;
}

export interface SegmentedControlProps<T extends string = string> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  value,
  options,
  onChange,
  disabled = false,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'inline-flex items-center p-0.5 rounded-[8px] bg-[#0D0D0E] border border-white/[0.07] select-none gap-0.5',
        disabled && 'opacity-35 pointer-events-none',
        className,
      )}
    >
      {options.map((option) => {
        const isSelected = option.id === value;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-[6px] transition-all cursor-pointer select-none active:scale-95',
              isSelected
                ? 'bg-[#18181B] text-white shadow-sm border border-white/[0.07]'
                : 'text-[#71717A] hover:text-white hover:bg-white/[0.03] border border-transparent',
            )}
          >
            {Icon && <Icon className="size-3.5" strokeWidth={1.5} />}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
