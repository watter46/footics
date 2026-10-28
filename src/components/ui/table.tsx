'use client';

import type * as React from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto rounded-[10px] border border-white/[0.07] bg-[#121214]"
    >
      <table
        data-slot="table"
        className={cn('w-full border-collapse text-left text-xs', className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        'border-b border-white/[0.07] text-[11px] font-mono text-[#71717A]',
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('divide-y divide-white/[0.04]', className)}
      {...props}
    />
  );
}

export function TableFooter({
  className,
  ...props
}: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'border-t border-white/[0.07] bg-[#0D0D0E] font-medium text-[#71717A]',
        className,
      )}
      {...props}
    />
  );
}

export interface TableRowProps extends React.ComponentProps<'tr'> {
  interactive?: boolean;
}

export function TableRow({
  className,
  interactive = true,
  ...props
}: TableRowProps) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'transition-colors duration-150',
        interactive && 'hover:bg-[#18181B] cursor-pointer group',
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn('py-3 px-4 font-normal whitespace-nowrap', className)}
      {...props}
    />
  );
}

export interface TableCellProps extends React.ComponentProps<'td'> {
  numeric?: boolean;
  align?: 'left' | 'center' | 'right';
}

export function TableCell({
  className,
  numeric = false,
  align = 'left',
  ...props
}: TableCellProps) {
  const alignClass =
    align === 'right' || numeric
      ? 'text-right'
      : align === 'center'
        ? 'text-center'
        : 'text-left';

  return (
    <td
      data-slot="table-cell"
      className={cn(
        'py-3.5 px-4 align-middle whitespace-nowrap text-[#F4F4F5]',
        numeric && 'font-mono',
        alignClass,
        className,
      )}
      {...props}
    />
  );
}

export function TableCaption({
  className,
  ...props
}: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-xs text-[#71717A]', className)}
      {...props}
    />
  );
}
