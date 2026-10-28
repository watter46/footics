'use client';

import { SearchIcon, X } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  ref?: React.Ref<HTMLInputElement>;
}

export function Input({
  ref,
  className,
  type = 'text',
  disabled,
  ...props
}: InputProps) {
  return (
    <input
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        'w-full bg-[#18181B] border border-white/[0.08] rounded-[8px] px-3 py-2 text-xs text-white placeholder-[#71717A] outline-none transition-all',
        'focus:border-[#FF8100]/60 focus:ring-1 focus:ring-[#FF8100]/30',
        'disabled:cursor-not-allowed disabled:opacity-35',
        className,
      )}
      {...props}
    />
  );
}

export interface SearchInputProps extends InputProps {
  onClear?: () => void;
}

export function SearchInput({
  ref,
  className,
  disabled,
  onClear,
  value,
  ...props
}: SearchInputProps) {
  const hasValue = Boolean(value);

  return (
    <div className="relative flex items-center w-full">
      <SearchIcon
        className="size-4 absolute left-3 text-[#71717A] pointer-events-none"
        strokeWidth={1.5}
      />
      <Input
        ref={ref}
        disabled={disabled}
        value={value}
        className={cn('pl-9', onClear && hasValue && 'pr-8', className)}
        {...props}
      />
      {onClear && hasValue && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2.5 text-[#71717A] hover:text-white transition-colors cursor-pointer"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
