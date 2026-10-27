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
        'inline-flex items-center p-0.5 rounded-lg bg-black/40 border border-white/10 select-none',
        disabled && 'opacity-50 pointer-events-none',
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
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer',
              isSelected
                ? 'bg-white/15 text-white shadow-xs'
                : 'text-white/60 hover:text-white/90 hover:bg-white/5',
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
