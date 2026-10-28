import type * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.ComponentProps<'div'> {
  ref?: React.Ref<HTMLDivElement>;
  interactive?: boolean;
}

export function Card({
  ref,
  className,
  interactive = false,
  ...props
}: CardProps) {
  return (
    <div
      ref={ref}
      data-slot="card"
      className={cn(
        'flex flex-col gap-4 overflow-hidden rounded-[10px] bg-[#18181B] border border-white/[0.07] p-4 text-sm text-[#F4F4F5] transition-all',
        interactive &&
          'hover:bg-[#1e1e22] hover:border-white/20 cursor-pointer surface-interactive',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'flex items-center justify-between border-b border-white/[0.07] pb-3',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="card-title"
      className={cn('text-sm font-bold text-white tracking-tight', className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      className={cn('text-xs text-[#71717A]', className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('text-xs text-[#A1A1AA]', className)}
      {...props}
    />
  );
}

export function CardFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center justify-between border-t border-white/[0.04] pt-2 text-xs text-[#A1A1AA]',
        className,
      )}
      {...props}
    />
  );
}

export function CardAction({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('self-start justify-self-end', className)}
      {...props}
    />
  );
}

export interface KpiTileProps extends React.ComponentProps<'div'> {
  ref?: React.Ref<HTMLDivElement>;
  title: string;
  value: string | number;
  subtext?: string;
  accentColor?: string;
  progressPercent?: number;
}

export function KpiTile({
  ref,
  title,
  value,
  subtext,
  accentColor = '#FF8100',
  progressPercent,
  className,
  ...props
}: KpiTileProps) {
  return (
    <div
      ref={ref}
      data-slot="kpi-tile"
      className={cn(
        'flex flex-col justify-between rounded-[10px] bg-[#18181B] border border-white/[0.07] p-4 text-[#F4F4F5] transition-all hover:border-white/20',
        className,
      )}
      {...props}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-[#71717A] uppercase tracking-wider">
            {title}
          </span>
          <span
            className="size-2 rounded-full shrink-0"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 0 6px ${accentColor}`,
            }}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-mono font-bold text-white">
            {value}
          </span>
          {subtext && (
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              {subtext}
            </span>
          )}
        </div>
      </div>

      {progressPercent !== undefined && (
        <div className="mt-4 space-y-1.5">
          <div className="w-full h-1.5 bg-[#0D0D0E] rounded-full overflow-hidden flex">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                backgroundColor: accentColor,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
