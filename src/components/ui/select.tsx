'use client';

import { Select as SelectPrimitive } from '@base-ui/react/select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const Select = SelectPrimitive.Root;

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn('scroll-my-1 p-1', className)}
      {...props}
    />
  );
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn('flex flex-1 text-left text-xs', className)}
      {...props}
    />
  );
}

function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: 'sm' | 'default';
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        'flex w-fit items-center justify-between gap-1.5 rounded-[8px] border border-white/[0.08] bg-[#18181B] py-2 pr-2.5 pl-3 text-xs text-white whitespace-nowrap transition-colors outline-none select-none cursor-pointer',
        'focus-visible:border-[#FF8100]/60 focus-visible:ring-1 focus-visible:ring-[#FF8100]/30',
        'disabled:cursor-not-allowed disabled:opacity-35',
        'data-placeholder:text-[#71717A]',
        size === 'default' ? 'h-8' : 'h-7',
        '*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-3.5 text-[#71717A]" />
        }
      />
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  side = 'bottom',
  sideOffset = 4,
  align = 'center',
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    'align' | 'alignOffset' | 'side' | 'sideOffset' | 'alignItemWithTrigger'
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-[200]"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            'relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-[8px] bg-[#222226] text-white shadow-xl border border-white/[0.08] duration-100',
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List className="p-1">
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn(
        'px-2 py-1 text-[10px] font-semibold text-[#71717A] uppercase tracking-wider',
        className,
      )}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'relative flex w-full cursor-pointer items-center gap-2 rounded-[6px] py-1.5 pr-8 pl-2 text-xs text-[#F4F4F5] outline-none select-none transition-colors',
        'focus:bg-white/[0.08] focus:text-white',
        'data-disabled:pointer-events-none data-disabled:opacity-35',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center text-[#FF8A00]" />
        }
      >
        <CheckIcon className="size-3.5" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        'pointer-events-none -mx-1 my-1 h-px bg-white/[0.07]',
        className,
      )}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        'top-0 z-10 flex w-full cursor-default items-center justify-center bg-[#222226] py-1 text-[#71717A]',
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-3.5" />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        'bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-[#222226] py-1 text-[#71717A]',
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-3.5" />
    </SelectPrimitive.ScrollDownArrow>
  );
}

export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  ref?: React.Ref<HTMLSelectElement>;
}

export function NativeSelect({
  ref,
  className,
  disabled,
  children,
  ...props
}: NativeSelectProps) {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        disabled={disabled}
        className={cn(
          'w-full appearance-none bg-[#18181B] border border-white/[0.08] rounded-[8px] px-3 py-2 text-xs text-white outline-none pr-8 cursor-pointer transition-all',
          'focus:border-[#FF8100]/60 focus:ring-1 focus:ring-[#FF8100]/30',
          'disabled:cursor-not-allowed disabled:opacity-35',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        className="size-4 text-[#71717A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        strokeWidth={1.5}
      />
    </div>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
