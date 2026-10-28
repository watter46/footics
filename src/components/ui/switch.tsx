'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  ref?: React.Ref<HTMLButtonElement>;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function Switch({
  ref,
  checked: controlledChecked,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  className,
  ...props
}: SwitchProps) {
  const [uncontrolledChecked, setUncontrolledChecked] =
    React.useState(defaultChecked);
  const isControlled = controlledChecked !== undefined;
  const isChecked = isControlled ? controlledChecked : uncontrolledChecked;

  const handleToggle = () => {
    if (disabled) return;
    const nextChecked = !isChecked;
    if (!isControlled) {
      setUncontrolledChecked(nextChecked);
    }
    onCheckedChange?.(nextChecked);
  };

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={isChecked}
      disabled={disabled}
      onClick={handleToggle}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all outline-none select-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-35',
        isChecked
          ? 'bg-[#FF8100] border border-transparent shadow-[0_0_8px_rgba(255,129,0,0.5)]'
          : 'bg-[#0D0D0E] border border-white/10 hover:border-white/20',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none block size-4 rounded-full shadow transition-transform duration-150',
          isChecked ? 'translate-x-4 bg-white' : 'translate-x-0 bg-[#71717A]',
        )}
      />
    </button>
  );
}
