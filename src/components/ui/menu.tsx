'use client';

import { Menu } from '@base-ui/react/menu';
import type * as React from 'react';
import { cn } from '@/lib/utils';

// DropdownMenu acts as both Menu namespace and Menu.Root for JSX convenience
export const DropdownMenu = Object.assign(Menu.Root, Menu);
export { Menu };
export const DropdownMenuRoot = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuPortal = Menu.Portal;
export const DropdownMenuPositioner = Menu.Positioner;
export const DropdownMenuGroup = Menu.Group;
export const DropdownMenuSub = Menu.SubmenuRoot;
export const DropdownMenuSubTrigger = Menu.SubmenuTrigger;
export const DropdownMenuRadioGroup = Menu.RadioGroup;
export const DropdownMenuRadioItem = Menu.RadioItem;
export const DropdownMenuCheckboxItem = Menu.CheckboxItem;

export interface DropdownMenuContentProps
  extends React.ComponentProps<typeof Menu.Popup> {
  side?: React.ComponentProps<typeof Menu.Positioner>['side'];
  align?: React.ComponentProps<typeof Menu.Positioner>['align'];
  sideOffset?: React.ComponentProps<typeof Menu.Positioner>['sideOffset'];
  alignOffset?: React.ComponentProps<typeof Menu.Positioner>['alignOffset'];
  collisionPadding?: React.ComponentProps<
    typeof Menu.Positioner
  >['collisionPadding'];
  anchor?: React.ComponentProps<typeof Menu.Positioner>['anchor'];
}

export function DropdownMenuContent({
  className,
  children,
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  alignOffset,
  collisionPadding,
  anchor,
  ...props
}: DropdownMenuContentProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        anchor={anchor}
      >
        <Menu.Popup
          className={cn(
            'z-50 min-w-[8rem] bg-[#222226] border border-white/[0.08] shadow-xl rounded-[8px] p-1 text-white animate-in fade-in-0 zoom-in-95 focus:outline-none',
            className,
          )}
          {...props}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof Menu.Item>) {
  return (
    <Menu.Item
      className={cn(
        'relative flex items-center gap-2 px-2.5 py-1.5 text-xs text-white/90 rounded-[6px] outline-none select-none cursor-pointer transition-colors hover:bg-white/[0.06] data-[highlighted]:bg-white/[0.06] data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof Menu.GroupLabel>) {
  return (
    <Menu.GroupLabel
      className={cn(
        'px-2.5 py-1 text-[10px] font-semibold text-[#71717A] tracking-wider uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Menu.Separator>) {
  return (
    <Menu.Separator
      className={cn('my-1 h-px bg-white/[0.08] -mx-1', className)}
      {...props}
    />
  );
}
