import * as React from 'react';

import { cn } from '@/lib/utils/cn';

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  align?: 'left' | 'center';
}

export const SectionHeader = ({
  title,
  subtitle,
  eyebrow,
  action,
  align = 'left',
  className,
  ...props
}: SectionHeaderProps) => (
  <div
    className={cn(
      'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
      align === 'center' ? 'text-center sm:text-left' : 'text-left',
      className
    )}
    {...props}
  >
    <div className="space-y-1">
      {eyebrow ? (
        <p className="text-primary/80 text-xs font-semibold tracking-[0.35em] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <div>
        <h2 className="text-foreground text-2xl font-semibold">{title}</h2>
        {subtitle ? (
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        ) : null}
      </div>
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);
