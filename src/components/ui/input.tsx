'use client';

import { SearchIcon } from 'lucide-react';
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
  ...props
}: SearchInputProps) {
  return (
    <div className="relative flex items-center w-full">
      <SearchIcon
        className="size-4 absolute left-3 text-[#71717A] pointer-events-none"
        strokeWidth={1.5}
      />
      <Input
        ref={ref}
        disabled={disabled}
        className={cn('pl-9', className)}
        {...props}
      />
    </div>
  );
}
