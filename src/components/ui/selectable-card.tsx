import * as React from 'react';

import { cn } from '@/lib/utils/cn';

type SelectableCardTone = 'default' | 'warning';

const baseClasses =
  'w-full rounded-2xl border px-5 py-4 text-left text-sm font-semibold text-white transition-colors duration-200';

const toneClasses: Record<SelectableCardTone, string> = {
  default:
    'border-slate-800 bg-[#111111] hover:border-slate-600 hover:bg-[#1E293B]',
  warning:
    'border-amber-500 bg-amber-600 text-white hover:border-amber-400 hover:bg-amber-500',
};

const selectedClasses: Record<SelectableCardTone, string> = {
  default: 'border-cyan-400 bg-cyan-400 text-slate-950',
  warning: 'border-amber-400 bg-amber-500 text-slate-950',
};

export interface SelectableCardProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: SelectableCardTone;
  isSelected?: boolean;
}

export const SelectableCard = React.forwardRef<
  HTMLButtonElement,
  SelectableCardProps
>(({ tone = 'default', isSelected = false, className, disabled, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      baseClasses,
      toneClasses[tone],
      isSelected && selectedClasses[tone],
      disabled && 'cursor-not-allowed border-slate-900 bg-slate-900 text-slate-500 opacity-60 hover:bg-slate-900',
      className
    )}
    disabled={disabled}
    {...props}
  />
));

SelectableCard.displayName = 'SelectableCard';
