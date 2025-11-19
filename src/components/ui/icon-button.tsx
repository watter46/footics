import * as React from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

export type IconButtonProps = Omit<ButtonProps, 'size'> & {
  srLabel?: string;
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      children,
      srLabel,
      variant = 'default',
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => (
    <Button
      ref={ref}
      size="icon"
      variant={variant}
      className={cn('h-11 w-11 rounded-full p-0', className)}
      aria-label={ariaLabel ?? srLabel}
      {...props}
    >
      {children}
      {srLabel ? <span className="sr-only">{srLabel}</span> : null}
    </Button>
  )
);

IconButton.displayName = 'IconButton';
