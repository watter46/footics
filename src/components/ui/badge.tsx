import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide text-slate-100 transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-primary/50 bg-primary/20 text-primary shadow-[0_0_1px_hsl(var(--primary)/0.5),0_0_10px_-5px_hsl(var(--primary)/0.5)]',
        outline: 'border-slate-700 bg-transparent text-slate-400',
        success: 'border-emerald-500 bg-emerald-600 text-white',
        warning: 'border-amber-500 bg-amber-600 text-white',
        info: 'border-sky-500 bg-sky-600 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { Badge };
