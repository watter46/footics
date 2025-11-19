import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'animate-pulse rounded-xl bg-slate-800/60 shadow-[0_0_1px_hsl(var(--primary)/0.3)]',
        className
      )}
      {...props}
    />
  )
);
Skeleton.displayName = 'Skeleton';

export { Skeleton };
