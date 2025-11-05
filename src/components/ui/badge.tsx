import * as React from 'react';
import { cn } from '@/lib/utils/cn';

type BadgeVariant = 'default' | 'outline' | 'success' | 'warning' | 'info';

const baseClasses =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-800 text-slate-100',
  outline: 'border border-slate-700 text-slate-100',
  success: 'bg-emerald-500/20 text-emerald-300',
  warning: 'bg-amber-500/20 text-amber-300',
  info: 'bg-sky-500/20 text-sky-300',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const Badge = ({ className, variant = 'default', ...props }: BadgeProps) => (
  <div
    className={cn(baseClasses, variantClasses[variant], className)}
    {...props}
  />
);

export { Badge };
