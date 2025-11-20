import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full border text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow-[0_0_1px_hsl(var(--primary)/0.5),0_0_15px_-3px_hsl(var(--primary)/0.6)] hover:bg-primary/90',
        outline:
          'border-slate-800 bg-[#111111] text-slate-100 shadow-[0_0_1px_hsl(var(--primary)/0.5)] hover:bg-slate-800',
        ghost:
          'border-transparent text-slate-300 shadow-[0_0_1px_hsl(var(--primary)/0.5)] hover:bg-slate-800 hover:text-slate-100',
        secondary:
          'border-transparent bg-slate-800 text-slate-100 shadow-[0_0_1px_hsl(var(--primary)/0.5)] hover:bg-slate-700',
        link: 'border-transparent text-primary underline-offset-4 hover:underline',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow-[0_0_15px_-3px_hsl(var(--destructive)/0.6)] hover:bg-destructive/90',
      },
      size: {
        default: 'h-11 px-6',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-7 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'outline',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, type = 'button', ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        type={asChild ? undefined : type}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
